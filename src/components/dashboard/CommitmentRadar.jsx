// src/components/dashboard/CommitmentRadar.jsx
import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Target, ShieldCheck, AlertTriangle, Calendar, Plus, Check, CheckCircle,
  ChevronDown, ChevronUp, Power, Trash2, Building2, Undo2, Wallet,
  SkipForward, CircleSlash, AlertOctagon, Pencil, MoreVertical, Loader2
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { monthShortName, toMYDate } from '../../utils/dateHelpers'
import { isPeriodPaid, isPeriodSkipped } from '../../utils/commitments/commitmentPayments'
import { MarkPaidSheet } from './MarkPaidSheet'
import { CommitmentFormSheet } from '../commitments/CommitmentFormSheet'
import { ConfirmSheet } from '../shared/ConfirmSheet'

// ============================================================
// Period pill
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
      color: 'text-danger-text bg-danger-soft border border-danger-border'
    }
  }
  if (period.daysUntil === 0) {
    return { label: 'Due today', color: 'text-danger-text bg-danger-soft border border-danger-border' }
  }
  if (period.daysUntil <= 3) {
    return { label: `In ${period.daysUntil}d`, color: 'text-warning-text bg-warning-soft border border-warning-border' }
  }
  if (period.daysUntil <= 7) {
    return { label: `In ${period.daysUntil}d`, color: 'text-info-text bg-info-soft border border-info-border' }
  }
  return {
    label: `Due ${dueMY.getUTCDate()} ${monthShortName(period.dueDate)}`,
    color: 'text-fg-muted bg-surface-2 border border-line'
  }
}

// ============================================================
// Row menu
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
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 min-w-[170px] bg-surface border border-line rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
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
                a.danger ? 'text-danger hover:bg-danger-soft' : 'text-fg-muted hover:bg-surface-2'
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
  const [formState, setFormState] = useState(null)
  const [confirm, setConfirm] = useState(null)

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

  const paymentCountByCommitment = useMemo(() => {
    const map = new Map()
    for (const p of payments) {
      map.set(p.commitment_id, (map.get(p.commitment_id) || 0) + 1)
    }
    return map
  }, [payments])

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

  if (loading) {
    return (
      <div className="bg-surface rounded-2xl shadow-md border border-line p-6">
        <div className="flex items-center justify-center py-10 text-fg-subtle">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2 text-sm font-medium">Loading bills…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-surface rounded-2xl shadow-md border border-danger-border p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-fg">Couldn't load bills</p>
            <p className="text-xs text-fg-muted mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!hasAnyCommitments) {
    return (
      <>
        <div className="bg-surface rounded-2xl shadow-md border border-line p-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-surface-3" />
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-surface-2 border border-line rounded-2xl flex items-center justify-center mx-auto mb-3 text-fg-subtle">
              <Target className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-fg">No bills yet</p>
            <p className="text-xs text-fg-subtle mt-1 max-w-[260px] mx-auto leading-relaxed">
              Add your first subscription or bill to track what's coming up.
            </p>
            <button
              onClick={() => setFormState({ mode: 'new' })}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-brand-solid hover:bg-brand-solid-hover text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
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

  return (
    <>
      <div
        className={`bg-surface rounded-2xl shadow-md border p-5 md:p-6 relative overflow-hidden transition-all duration-300 ${
          isSafe ? 'border-line' : 'border-danger-border'
        }`}
      >
        <div className={`absolute top-0 inset-x-0 h-1 ${isSafe ? 'bg-success' : 'bg-danger'}`} />

        {/* Header */}
        <div className="flex justify-between items-center mb-5 mt-1 gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-fg">Bills</h2>
            <p className="text-xs text-fg-subtle mt-0.5">Subscriptions & recurring payments</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setFormState({ mode: 'new' })}
              className="w-11 h-11 flex items-center justify-center text-fg-muted hover:text-brand hover:bg-surface-2 rounded-xl transition-all border border-transparent hover:border-line"
              title="Add bill"
              aria-label="Add bill"
            >
              <Plus className="w-5 h-5" />
            </button>
            <div
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider flex items-center gap-1.5 border shadow-sm ${
                isSafe
                  ? 'bg-success-soft text-success-text border-success-border'
                  : 'bg-danger-soft text-danger-text border-danger-border'
              }`}
            >
              {isSafe ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {isSafe ? 'SAFE' : 'SHORT'}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
          <div className="rounded-xl border border-line bg-surface p-2.5 md:p-3.5 shadow-sm min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle whitespace-nowrap">
              Available
            </span>
            <p className="text-sm font-black tracking-tight text-fg mt-1 whitespace-nowrap">
              {formatMYR(currentBalance)}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-2.5 md:p-3.5 shadow-sm min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle whitespace-nowrap">
              To pay
            </span>
            <p className="text-sm font-black tracking-tight text-fg mt-1 whitespace-nowrap">
              {formatMYR(totalRequired)}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-2.5 md:p-3.5 shadow-sm min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle whitespace-nowrap">
              Unpaid
            </span>
            <p
              className={`text-sm font-black tracking-tight mt-1 whitespace-nowrap ${
                unpaidCount > 0 ? 'text-warning' : 'text-fg'
              }`}
            >
              {unpaidCount}
            </p>
          </div>
        </div>

        {/* Needs attention banner */}
        {scheduleSafe.needsAttention.length > 0 && (
          <div className="mb-3 bg-warning-soft border border-warning-border rounded-xl p-3 flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-warning-text leading-relaxed">
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
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-warning-text hover:text-warning-text/80 underline underline-offset-2"
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
                className="bg-warning-soft border border-warning-border rounded-xl p-3 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-warning-text leading-relaxed">
                  <strong>{sf.accountName}</strong> is short by{' '}
                  <strong>{formatMYR(sf.shortfall)}</strong> for bills before payday.
                </p>
              </div>
            ))}
            {isSafe && (
              <p className="text-[11px] text-warning-text italic px-1">
                Your total covers it, but the account
                {scheduleSafe.accountShortfalls.length === 1 ? '' : 's'} above don't. Move money
                before the due dates.
              </p>
            )}
          </div>
        )}

        {/* Unpaid periods */}
        <div className="mb-4">
          <p className="text-[10px] text-fg-subtle uppercase font-bold tracking-wider mb-2.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand" /> Coming up ({scheduleSafe.unpaidPeriods.length})
          </p>

          {scheduleSafe.unpaidPeriods.length === 0 ? (
            <div className="text-xs font-medium text-success-text p-3.5 bg-success-soft border border-success-border rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success shrink-0" />
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
                  ? 'bg-danger-soft/50 border-danger-border'
                  : accountShort
                    ? 'bg-warning-soft/50 border-warning-border'
                    : 'bg-surface border-line hover:border-line-strong'

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
                          <div className="bg-danger/15 p-1.5 rounded-lg text-danger shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <span className="text-fg-subtle shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap uppercase tracking-wider ${pill.color}`}
                        >
                          {pill.label}
                        </span>
                        <span className="text-sm font-bold text-fg truncate">{comm.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-fg-muted pl-1 flex-wrap">
                        <Building2 className="w-3 h-3 text-fg-subtle shrink-0" />
                        <span>
                          Deducts from:{' '}
                          <strong className="text-fg">
                            {account?.account_name || 'Unknown'}
                          </strong>
                        </span>
                        <span className="text-line-strong">·</span>
                        <Wallet className="w-3 h-3 text-fg-subtle shrink-0" />
                        <span className={accountShort ? 'text-warning-text font-semibold' : ''}>
                          {formatMYR(accountBalance)} available
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 border-line pt-3 sm:pt-0">
                      <span className="text-sm font-black whitespace-nowrap text-fg">
                        {formatMYR(period.amount)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setConfirm({ kind: 'skip', commitment: comm, period })
                          }
                          disabled={saving}
                          className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-fg-muted bg-surface-2 hover:bg-surface-3 border border-line rounded-lg transition-all disabled:opacity-50"
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
                          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-success-text bg-success-soft hover:bg-success-soft/80 border border-success-border rounded-lg transition-all shadow-sm disabled:opacity-50"
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
              className="w-full flex items-center justify-between p-3 bg-surface hover:bg-surface-2 border border-line rounded-xl transition-colors shadow-sm"
              aria-expanded={showPaid}
              style={{ minHeight: 44 }}
            >
              <span className="text-[10px] text-fg-muted uppercase font-bold tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-success" /> Paid this month (
                {paidCommitments.length})
              </span>
              {showPaid ? <ChevronUp className="w-4 h-4 text-fg-subtle" /> : <ChevronDown className="w-4 h-4 text-fg-subtle" />}
            </button>

            {showPaid && (
              <div className="mt-2 space-y-1.5">
                {paidCommitments.map((comm) => (
                  <div
                    key={comm.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-success-soft/30 border border-success-border gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                      <span className="text-xs font-medium text-fg-muted line-through truncate">
                        {comm.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-fg-subtle line-through">
                        {formatMYR(comm.amount)}
                      </span>
                      <button
                        onClick={() => setConfirm({ kind: 'undo', commitment: comm })}
                        disabled={saving}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-fg-subtle hover:text-fg hover:bg-surface px-2.5 py-2 rounded-md transition-colors border border-transparent hover:border-line disabled:opacity-50"
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
              className="w-full flex items-center justify-between p-3 bg-surface hover:bg-surface-2 border border-line rounded-xl transition-colors shadow-sm"
              aria-expanded={showSkipped}
              style={{ minHeight: 44 }}
            >
              <span className="text-[10px] text-fg-muted uppercase font-bold tracking-wider flex items-center gap-1.5">
                <CircleSlash className="w-3.5 h-3.5 text-fg-subtle" /> Skipped this month (
                {skippedCommitments.length})
              </span>
              {showSkipped ? <ChevronUp className="w-4 h-4 text-fg-subtle" /> : <ChevronDown className="w-4 h-4 text-fg-subtle" />}
            </button>

            {showSkipped && (
              <div className="mt-2 space-y-1.5">
                {skippedCommitments.map((comm) => (
                  <div
                    key={comm.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2/40 border border-line gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <CircleSlash className="w-3.5 h-3.5 text-fg-subtle shrink-0" />
                      <span className="text-xs font-medium text-fg-muted truncate">{comm.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-fg-subtle">{formatMYR(comm.amount)}</span>
                      <button
                        onClick={() => setConfirm({ kind: 'undo', commitment: comm })}
                        disabled={saving}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-fg-subtle hover:text-fg hover:bg-surface px-2.5 py-2 rounded-md transition-colors border border-transparent hover:border-line disabled:opacity-50"
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
              className="w-full flex items-center justify-between p-3 bg-surface hover:bg-surface-2 border border-line rounded-xl transition-colors shadow-sm"
              aria-expanded={showInactive}
              style={{ minHeight: 44 }}
            >
              <span className="text-[10px] text-fg-muted uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Power className="w-3.5 h-3.5 text-fg-subtle" /> Paused ({inactiveCommitments.length})
              </span>
              {showInactive ? <ChevronUp className="w-4 h-4 text-fg-subtle" /> : <ChevronDown className="w-4 h-4 text-fg-subtle" />}
            </button>

            {showInactive && (
              <div className="mt-2 space-y-1.5">
                {inactiveCommitments.map((comm) => (
                  <div
                    key={comm.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-2/50 border border-line gap-2"
                  >
                    <span className="text-xs font-bold text-fg-muted truncate min-w-0">
                      {comm.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-fg-subtle mr-1">
                        {formatMYR(comm.amount)}
                      </span>
                      <button
                        onClick={() => onReactivateCommitment(comm.id)}
                        disabled={saving}
                        className="flex items-center justify-center w-11 h-11 text-fg-subtle hover:text-success hover:bg-success-soft rounded-lg transition-all border border-transparent hover:border-success-border disabled:opacity-50"
                        aria-label={`Reactivate ${comm.name}`}
                        title="Reactivate"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setFormState({ mode: 'edit', commitment: comm })}
                        className="flex items-center justify-center w-11 h-11 text-fg-subtle hover:text-brand hover:bg-brand-soft rounded-lg transition-all border border-transparent hover:border-brand/30"
                        aria-label={`Edit ${comm.name}`}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirm({ kind: 'delete', commitment: comm })}
                        className="flex items-center justify-center w-11 h-11 text-danger/70 hover:text-danger hover:bg-danger-soft rounded-lg transition-all border border-transparent hover:border-danger-border"
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
          <div className="bg-danger-soft border border-danger-border rounded-xl p-3.5 mt-4 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-danger-text">
                You're short by {formatMYR(shortfall)}
              </p>
              <p className="text-xs text-danger-text/90 mt-0.5 leading-relaxed">
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