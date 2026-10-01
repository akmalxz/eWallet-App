// src/components/dashboard/CommitmentRadar.jsx
import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Target, ShieldCheck, AlertTriangle, Calendar, Plus, Check, CheckCircle,
  ChevronDown, ChevronUp, Power, Trash2, Building2, Undo2, Wallet,
  SkipForward, CircleSlash, AlertOctagon, Pencil, MoreVertical, Loader2
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { monthShortName, toMYDate } from '../../utils/dateHelpers'
import { isPeriodPaid, isPeriodSkipped } from '../../utils/commitmentPayments'
import { MarkPaidSheet } from './MarkPaidSheet'
import { CommitmentFormSheet } from '../commitments/CommitmentFormSheet'
import { ConfirmSheet } from '../shared/ConfirmSheet'

// ============================================================
// Period pill (P3.6)
// ============================================================
const getPeriodPill = (period, nowMY) => {
  const dueMY = toMYDate(period.dueDate)
  const isSameMonth =
    dueMY.getUTCFullYear() === nowMY.getUTCFullYear() &&
    dueMY.getUTCMonth() === nowMY.getUTCMonth()

  if (period.daysOverdue > 0) {
    const prefix = isSameMonth ? '' : `${monthShortName(period.dueDate)} · `
    return {
      label: `${prefix}${period.daysOverdue}d overdue`,
      color: 'text-red-700 bg-red-50 border border-red-200'
    }
  }
  if (period.daysUntil === 0) {
    return { label: 'Due today', color: 'text-red-600 bg-red-50 border border-red-200' }
  }
  if (period.daysUntil <= 3) {
    return { label: `In ${period.daysUntil}d`, color: 'text-amber-700 bg-amber-50 border border-amber-200' }
  }
  if (period.daysUntil <= 7) {
    return { label: `In ${period.daysUntil}d`, color: 'text-blue-700 bg-blue-50 border border-blue-200' }
  }
  return {
    label: `Due ${dueMY.getUTCDate()} ${monthShortName(period.dueDate)}`,
    color: 'text-slate-500 bg-slate-50 border border-slate-200'
  }
}

// ============================================================
// Row menu — small popover with 44px items
// ============================================================
const RowMenu = ({ actions, ariaLabel = 'Bill actions' }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 min-w-[170px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {actions.map((a) => (
            <button
              key={a.label}
              role="menuitem"
              type="button"
              disabled={a.disabled}
              onClick={() => {
                setOpen(false)
                a.onClick()
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left transition-colors disabled:opacity-50 ${
                a.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
              }`}
              style={{ minHeight: 44 }}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Radar
// ============================================================
export const CommitmentRadar = ({
  radarStats,
  schedule,
  commitments = [],
  payments = [],
  accounts = [],
  saving = false,
  loading = false,
  error = null,
  // mutations from useCommitments
  onAddCommitment,
  onUpdateCommitment,
  onDeleteCommitment,
  onPauseCommitment,
  onReactivateCommitment,
  onMarkAsPaid,
  onSkipCommitment,
  onUnmarkAsPaid
}) => {
  const [showPaid, setShowPaid] = useState(false)
  const [showSkipped, setShowSkipped] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [marking, setMarking] = useState(null)
  const [markPaidError, setMarkPaidError] = useState(null)
  const [formState, setFormState] = useState(null) // null | { mode: 'new' } | { mode: 'edit', commitment }
  const [confirm, setConfirm] = useState(null)
  // { kind: 'delete'|'pause'|'skip'|'undo', commitment, period?, paymentCount? }

  const {
    currentBalance = 0,
    totalRequired = 0,
    unpaidCount = 0,
    isSafe = true,
    shortfall = 0
  } = radarStats || {}

  const scheduleSafe = schedule || {
    unpaidPeriods: [],
    total: 0,
    needsAttention: [],
    accountShortfalls: []
  }

  const getAccount = (id) => accounts.find((a) => a.id === id)

  const nowMY = toMYDate(new Date())
  const currentYear = nowMY.getUTCFullYear()
  const currentMonth = nowMY.getUTCMonth() + 1

  const activeAll = commitments.filter((c) => c.is_active)

  const inactiveCommitments = [...commitments.filter((c) => !c.is_active)].sort(
    (a, b) => a.due_day_of_month - b.due_day_of_month
  )

  const paidCommitments = activeAll
    .filter((c) => isPeriodPaid(payments, c.id, currentYear, currentMonth))
    .sort((a, b) => a.due_day_of_month - b.due_day_of_month)

  const skippedCommitments = activeAll
    .filter((c) => isPeriodSkipped(payments, c.id, currentYear, currentMonth))
    .sort((a, b) => a.due_day_of_month - b.due_day_of_month)

  const hasAnyCommitments = commitments.length > 0

  // Payments count per commitment — for the delete confirmation copy
  const paymentCountByCommitment = useMemo(() => {
    const map = new Map()
    for (const p of payments) {
      map.set(p.commitment_id, (map.get(p.commitment_id) || 0) + 1)
    }
    return map
  }, [payments])

  // ---------- Form submit (add OR edit) ----------
  const handleFormSubmit = async (payload, existing) => {
    if (existing) {
      const res = await onUpdateCommitment(existing.id, payload)
      if (res?.success) setFormState(null)
      return res
    }
    const res = await onAddCommitment(payload)
    if (res?.success) setFormState(null)
    return res
  }

  // ---------- Mark paid ----------
  const handleMarkPaidConfirm = async ({ periodYear, periodMonth, amount, paidDate }) => {
    if (!onMarkAsPaid || !marking) return
    setMarkPaidError(null)
    const result = await onMarkAsPaid(marking.commitmentId, {
      periodYear,
      periodMonth,
      amount,
      paidDate
    })
    if (result?.success) {
      setMarking(null)
      setMarkPaidError(null)
    } else {
      setMarkPaidError(result?.error || 'Could not mark as paid. Please try again.')
    }
  }

  // ---------- Confirmations ----------
  const confirmActions = {
    delete: async () => {
      const c = confirm.commitment
      const res = await onDeleteCommitment(c.id)
      if (res?.success) setConfirm(null)
    },
    pause: async () => {
      const c = confirm.commitment
      const res = await onPauseCommitment(c.id)
      if (res?.success) setConfirm(null)
    },
    skip: async () => {
      const p = confirm.period
      const res = await onSkipCommitment(p.commitmentId, p.periodYear, p.periodMonth)
      if (res?.success) setConfirm(null)
    },
    undo: async () => {
      const c = confirm.commitment
      const res = await onUnmarkAsPaid(c.id, currentYear, currentMonth)
      if (res?.success) setConfirm(null)
    }
  }

  // ---- Loading / error states (P4.7.3) ----
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6">
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2 text-sm font-medium">Loading bills…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-red-100 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-slate-800">Couldn't load bills</p>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // ---- Empty state ----
  if (!hasAnyCommitments) {
    return (
      <>
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-slate-200" />
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
              <Target className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No bills yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[260px] mx-auto leading-relaxed">
              Add your first subscription or bill to track what's coming up.
            </p>
            <button
              onClick={() => setFormState({ mode: 'new' })}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              style={{ minHeight: 44 }}
            >
              <Plus className="w-4 h-4" /> Add your first bill
            </button>
          </div>
        </div>

        {formState && (
          <CommitmentFormSheet
            commitment={formState.mode === 'edit' ? formState.commitment : null}
            accounts={accounts}
            allCommitments={commitments}
            saving={saving}
            onSubmit={handleFormSubmit}
            onCancel={() => setFormState(null)}
          />
        )}
      </>
    )
  }

  // ---- Main ----
  return (
    <>
      <div
        className={`bg-white rounded-2xl shadow-md border p-5 md:p-6 relative overflow-hidden transition-all duration-300 ${
          isSafe ? 'border-slate-100 shadow-slate-100/40' : 'border-red-100 shadow-red-50/30'
        }`}
      >
        <div className={`absolute top-0 inset-x-0 h-1 ${isSafe ? 'bg-emerald-500' : 'bg-red-500'}`} />

        {/* Header */}
        <div className="flex justify-between items-center mb-5 mt-1 gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-800">Bills</h2>
            <p className="text-xs text-slate-400 mt-0.5">Subscriptions & recurring payments</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setFormState({ mode: 'new' })}
              className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200"
              title="Add bill"
              aria-label="Add bill"
            >
              <Plus className="w-5 h-5" />
            </button>
            <div
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider flex items-center gap-1.5 border shadow-sm ${
                isSafe
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {isSafe ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {isSafe ? 'SAFE' : 'SHORT'}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
          <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 md:p-3.5 shadow-sm min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Available
            </span>
            <p className="text-sm font-black tracking-tight text-slate-800 mt-1 whitespace-nowrap">
              {formatMYR(currentBalance)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 md:p-3.5 shadow-sm min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              To pay
            </span>
            <p className="text-sm font-black tracking-tight text-slate-800 mt-1 whitespace-nowrap">
              {formatMYR(totalRequired)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 md:p-3.5 shadow-sm min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Unpaid
            </span>
            <p
              className={`text-sm font-black tracking-tight mt-1 whitespace-nowrap ${
                unpaidCount > 0 ? 'text-amber-600' : 'text-slate-800'
              }`}
            >
              {unpaidCount}
            </p>
          </div>
        </div>

        {/* Needs attention banner (P4.6.1) */}
        {scheduleSafe.needsAttention.length > 0 && (
          <div className="mb-3 bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>{scheduleSafe.needsAttention.length}</strong> bill
                {scheduleSafe.needsAttention.length === 1 ? '' : 's'} aren't counted because{' '}
                {scheduleSafe.needsAttention.length === 1 ? 'its' : 'their'} account is archived or
                missing.
              </p>
              <button
                type="button"
                onClick={() =>
                  setFormState({
                    mode: 'edit',
                    commitment: scheduleSafe.needsAttention[0].commitment
                  })
                }
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900 underline underline-offset-2"
                style={{ minHeight: 32 }}
              >
                Fix "{scheduleSafe.needsAttention[0].commitment.name}"
                {scheduleSafe.needsAttention.length > 1 &&
                  ` (${scheduleSafe.needsAttention.length - 1} more)`}
              </button>
            </div>
          </div>
        )}

        {/* Per-account shortfall warnings */}
        {scheduleSafe.accountShortfalls.length > 0 && (
          <div className="mb-4 space-y-2">
            {scheduleSafe.accountShortfalls.map((sf) => (
              <div
                key={sf.accountId}
                className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>{sf.accountName}</strong> is short by{' '}
                  <strong>{formatMYR(sf.shortfall)}</strong> for bills before payday.
                </p>
              </div>
            ))}
            {isSafe && (
              <p className="text-[11px] text-amber-700 italic px-1">
                Your total covers it, but the account
                {scheduleSafe.accountShortfalls.length === 1 ? '' : 's'} above don't. Move money
                before the due dates.
              </p>
            )}
          </div>
        )}

        {/* Unpaid periods */}
        <div className="mb-4">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-500" /> Coming up ({scheduleSafe.unpaidPeriods.length})
          </p>

          {scheduleSafe.unpaidPeriods.length === 0 ? (
            <div className="text-xs font-medium text-emerald-700 p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              You've handled everything for this month.
            </div>
          ) : (
            <div className="space-y-2">
              {scheduleSafe.unpaidPeriods.map((period) => {
                const comm = period.commitment
                const account = getAccount(period.accountId)
                const accountBalance = account?.balance ?? 0
                const pill = getPeriodPill(period, nowMY)
                const isOverdue = period.daysOverdue > 0
                const accountShort = period.accountShort

                const rowClass = isOverdue
                  ? 'bg-red-50/50 border-red-200'
                  : accountShort
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-white border-slate-100 hover:border-slate-200'

                const rowActions = [
                  {
                    label: 'Edit',
                    icon: <Pencil className="w-3.5 h-3.5" />,
                    onClick: () => setFormState({ mode: 'edit', commitment: comm })
                  },
                  {
                    label: 'Pause',
                    icon: <Power className="w-3.5 h-3.5" />,
                    onClick: () => setConfirm({ kind: 'pause', commitment: comm })
                  },
                  {
                    label: 'Delete',
                    icon: <Trash2 className="w-3.5 h-3.5" />,
                    danger: true,
                    onClick: () => setConfirm({ kind: 'delete', commitment: comm })
                  }
                ]

                return (
                  <div
                    key={`${period.commitmentId}-${period.periodYear}-${period.periodMonth}`}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl transition-all border shadow-sm gap-3 sm:gap-4 ${rowClass}`}
                  >
                    <div className="flex flex-col gap-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {isOverdue ? (
                          <div className="bg-red-100 p-1.5 rounded-lg text-red-600 shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <span className="text-slate-400 shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap uppercase tracking-wider ${pill.color}`}
                        >
                          {pill.label}
                        </span>
                        <span className="text-sm font-bold text-slate-800 truncate">{comm.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 pl-1 flex-wrap">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>
                          Deducts from:{' '}
                          <strong className="text-slate-700">
                            {account?.account_name || 'Unknown'}
                          </strong>
                        </span>
                        <span className="text-slate-300">·</span>
                        <Wallet className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className={accountShort ? 'text-amber-700 font-semibold' : ''}>
                          {formatMYR(accountBalance)} available
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                      <span className="text-sm font-black whitespace-nowrap text-slate-900">
                        {formatMYR(period.amount)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setConfirm({ kind: 'skip', commitment: comm, period })
                          }
                          disabled={saving}
                          className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all disabled:opacity-50"
                          style={{ minHeight: 44 }}
                          title="Skip this month"
                          aria-label={`Skip ${comm.name} for this period`}
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Skip</span>
                        </button>

                        <button
                          onClick={() => {
                            setMarkPaidError(null)
                            setMarking(period)
                          }}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all shadow-sm disabled:opacity-50"
                          style={{ minHeight: 44 }}
                        >
                          <Check className="w-3.5 h-3.5" /> Paid
                        </button>

                        <RowMenu actions={rowActions} ariaLabel={`${comm.name} actions`} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Paid this month */}
        {paidCommitments.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setShowPaid(!showPaid)}
              className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors shadow-sm"
              aria-expanded={showPaid}
              style={{ minHeight: 44 }}
            >
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Paid this month (
                {paidCommitments.length})
              </span>
              {showPaid ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showPaid && (
              <div className="mt-2 space-y-1.5">
                {paidCommitments.map((comm) => (
                  <div
                    key={comm.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/30 border border-emerald-100/50 gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs font-medium text-slate-500 line-through truncate">
                        {comm.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-400 line-through">
                        {formatMYR(comm.amount)}
                      </span>
                      <button
                        onClick={() => setConfirm({ kind: 'undo', commitment: comm })}
                        disabled={saving}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-700 hover:bg-white px-2.5 py-2 rounded-md transition-colors border border-transparent hover:border-slate-200 disabled:opacity-50"
                        style={{ minHeight: 44 }}
                        aria-label={`Undo payment for ${comm.name}`}
                      >
                        <Undo2 className="w-3.5 h-3.5" /> Undo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Skipped this month */}
        {skippedCommitments.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setShowSkipped(!showSkipped)}
              className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors shadow-sm"
              aria-expanded={showSkipped}
              style={{ minHeight: 44 }}
            >
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                <CircleSlash className="w-3.5 h-3.5 text-slate-400" /> Skipped this month (
                {skippedCommitments.length})
              </span>
              {showSkipped ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showSkipped && (
              <div className="mt-2 space-y-1.5">
                {skippedCommitments.map((comm) => (
                  <div
                    key={comm.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/40 border border-slate-100 gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <CircleSlash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs font-medium text-slate-500 truncate">{comm.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-400">{formatMYR(comm.amount)}</span>
                      <button
                        onClick={() => setConfirm({ kind: 'undo', commitment: comm })}
                        disabled={saving}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-700 hover:bg-white px-2.5 py-2 rounded-md transition-colors border border-transparent hover:border-slate-200 disabled:opacity-50"
                        style={{ minHeight: 44 }}
                      >
                        <Undo2 className="w-3.5 h-3.5" /> Undo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Paused */}
        {inactiveCommitments.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setShowInactive(!showInactive)}
              className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors shadow-sm"
              aria-expanded={showInactive}
              style={{ minHeight: 44 }}
            >
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Power className="w-3.5 h-3.5 text-slate-400" /> Paused ({inactiveCommitments.length})
              </span>
              {showInactive ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showInactive && (
              <div className="mt-2 space-y-1.5">
                {inactiveCommitments.map((comm) => (
                  <div
                    key={comm.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100 gap-2"
                  >
                    <span className="text-xs font-bold text-slate-500 truncate min-w-0">
                      {comm.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-slate-400 mr-1">
                        {formatMYR(comm.amount)}
                      </span>
                      <button
                        onClick={() => onReactivateCommitment(comm.id)}
                        disabled={saving}
                        className="flex items-center justify-center w-11 h-11 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all border border-transparent hover:border-emerald-200 disabled:opacity-50"
                        aria-label={`Reactivate ${comm.name}`}
                        title="Reactivate"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setFormState({ mode: 'edit', commitment: comm })}
                        className="flex items-center justify-center w-11 h-11 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-200"
                        aria-label={`Edit ${comm.name}`}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirm({ kind: 'delete', commitment: comm })}
                        className="flex items-center justify-center w-11 h-11 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-200"
                        aria-label={`Delete ${comm.name}`}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Top-level shortfall */}
        {!isSafe && totalRequired > 0 && (
          <div className="bg-red-50/60 border border-red-200/60 rounded-xl p-3.5 mt-4 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-800">
                You're short by {formatMYR(shortfall)}
              </p>
              <p className="text-xs text-red-700/90 mt-0.5 leading-relaxed">
                Your available balance doesn't cover every unpaid bill this month.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mark-paid sheet */}
      {marking && (
        <MarkPaidSheet
          commitment={marking.commitment}
          period={{ year: marking.periodYear, month: marking.periodMonth }}
          accounts={accounts}
          saving={saving}
          error={markPaidError}
          onConfirm={handleMarkPaidConfirm}
          onCancel={() => {
            setMarking(null)
            setMarkPaidError(null)
          }}
        />
      )}

      {/* Form sheet */}
      {formState && (
        <CommitmentFormSheet
          commitment={formState.mode === 'edit' ? formState.commitment : null}
          accounts={accounts}
          allCommitments={commitments}
          saving={saving}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormState(null)}
        />
      )}

      {/* Confirmation sheet */}
      {confirm && (
        <ConfirmSheet
          destructive={confirm.kind !== 'pause'}
          saving={saving}
          title={
            confirm.kind === 'delete'
              ? `Delete "${confirm.commitment.name}"?`
              : confirm.kind === 'pause'
                ? `Pause "${confirm.commitment.name}"?`
                : confirm.kind === 'skip'
                  ? `Skip "${confirm.commitment.name}" for ${monthShortName(confirm.period.dueDate)}?`
                  : `Undo payment for "${confirm.commitment.name}"?`
          }
          message={(() => {
            if (confirm.kind === 'delete') {
              const n = paymentCountByCommitment.get(confirm.commitment.id) || 0
              const lines = []
              if (n > 0) lines.push(`This bill has ${n} payment${n === 1 ? '' : 's'} recorded.`)
              lines.push('The expenses stay in your history. You can pause it instead.')
              return lines.join(' ')
            }
            if (confirm.kind === 'pause') {
              return "It won't count in your radar or burn rate until you reactivate it."
            }
            if (confirm.kind === 'skip') {
              return "It won't count this month. The expense will not be created."
            }
            return 'The bill will be reset to unpaid for this month.'
          })()}
          confirmLabel={
            confirm.kind === 'delete'
              ? 'Delete'
              : confirm.kind === 'pause'
                ? 'Pause'
                : confirm.kind === 'skip'
                  ? 'Skip'
                  : 'Undo'
          }
          onConfirm={confirmActions[confirm.kind]}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}