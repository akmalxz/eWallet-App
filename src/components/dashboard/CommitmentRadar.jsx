// src/components/dashboard/CommitmentRadar.jsx
import { useState } from 'react'
import {
  Target, ShieldCheck, AlertTriangle, Calendar, Plus, Check, CheckCircle,
  ChevronDown, ChevronUp, Power, Trash2, Building2, Undo2, Wallet
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import {
  getCommitmentTiming,
  isPaidThisMonth,
  monthShortName
} from '../../utils/dateHelpers'
import { MarkPaidSheet } from './MarkPaidSheet'

// Status pill from timing
const getStatusPill = (timing) => {
  if (timing.kind === 'overdue') {
    return {
      label: `${timing.days}d overdue`,
      color: 'text-red-700 bg-red-50 border border-red-200'
    }
  }
  if (timing.kind === 'today') {
    return {
      label: 'Due today',
      color: 'text-red-600 bg-red-50 border border-red-200'
    }
  }
  if (timing.days <= 3) {
    return {
      label: `In ${timing.days}d`,
      color: 'text-amber-700 bg-amber-50 border border-amber-200'
    }
  }
  if (timing.days <= 7) {
    return {
      label: `In ${timing.days}d`,
      color: 'text-blue-700 bg-blue-50 border border-blue-200'
    }
  }
  return {
    label: `Due ${timing.effectiveDueDay} ${monthShortName()}`,
    color: 'text-slate-500 bg-slate-50 border border-slate-200'
  }
}

// Sort key: overdue first (by days overdue desc), then soonest.
// Overdue 5d = -5, overdue 1d = -1, today = 0, in 3d = 3, in 10d = 10
const sortKeyFor = (comm) => {
  const timing = getCommitmentTiming(comm.due_day_of_month)
  if (timing.kind === 'overdue') return -timing.days
  if (timing.kind === 'today') return 0
  return timing.days
}

export const CommitmentRadar = ({
  radarStats,
  commitments = [],
  accounts = [],
  onAddCommitment,
  onDeleteCommitment,
  onToggleCommitment,
  onMarkAsPaid,
  onUnmarkAsPaid,
  saving = false
}) => {
  const [showPaid, setShowPaid] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [marking, setMarking] = useState(null) // commitment being marked

  const {
    currentBalance = 0,
    totalRequired = 0,
    isSafe = true,
    shortfall = 0
  } = radarStats || {}

  const getAccount = (id) => accounts.find(a => a.id === id)

  // Split into buckets using last_paid timestamp (year-aware)
  const activeAll = commitments.filter(c => c.is_active)
  const inactiveCommitments = [...commitments.filter(c => !c.is_active)]
    .sort((a, b) => a.due_day_of_month - b.due_day_of_month)

  const unpaidCommitments = activeAll
    .filter(c => !isPaidThisMonth(c.last_paid))
    .sort((a, b) => sortKeyFor(a) - sortKeyFor(b))

  const paidCommitments = activeAll
    .filter(c => isPaidThisMonth(c.last_paid))
    .sort((a, b) => a.due_day_of_month - b.due_day_of_month)

  const hasAnyCommitments = commitments.length > 0

  const handleMarkPaidConfirm = async ({ amount, paidDate }) => {
    if (!onMarkAsPaid || !marking) return
    await onMarkAsPaid(marking.id, { amount, paidDate })
    setMarking(null)
  }

  // ---- Empty state (no commitments at all) --------------------------------
  if (!hasAnyCommitments) {
    return (
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
          {onAddCommitment && (
            <button
              onClick={onAddCommitment}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              style={{ minHeight: 44 }}
            >
              <Plus className="w-4 h-4" /> Add your first bill
            </button>
          )}
        </div>
      </div>
    )
  }

  // ---- Main card ----------------------------------------------------------
  return (
    <>
      <div className={`bg-white rounded-2xl shadow-md border p-5 md:p-6 relative overflow-hidden transition-all duration-300 ${
        isSafe ? 'border-slate-100 shadow-slate-100/40' : 'border-red-100 shadow-red-50/30'
      }`}>
        <div className={`absolute top-0 inset-x-0 h-1 ${isSafe ? 'bg-emerald-500' : 'bg-red-500'}`} />

        {/* Header */}
        <div className="flex justify-between items-center mb-5 mt-1 gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-800">Commitments</h2>
            <p className="text-xs text-slate-400 mt-0.5">Track your subscriptions & bills</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onAddCommitment && (
              <button
                onClick={onAddCommitment}
                className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200"
                title="Add commitment"
                aria-label="Add commitment"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
            <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider flex items-center gap-1.5 border shadow-sm ${
              isSafe ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {isSafe ? <ShieldCheck className="w-3.5 h-3.5"/> : <AlertTriangle className="w-3.5 h-3.5"/>}
              {isSafe ? 'SAFE' : 'SHORT'}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-5">
          <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 md:p-3.5 shadow-sm min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Available</span>
            <p className="text-sm font-black tracking-tight text-slate-800 mt-1 whitespace-nowrap">
              {formatMYR(currentBalance)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 md:p-3.5 shadow-sm min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">To pay</span>
            <p className="text-sm font-black tracking-tight text-slate-800 mt-1 whitespace-nowrap">
              {formatMYR(totalRequired)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 md:p-3.5 shadow-sm min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Unpaid</span>
            <p className={`text-sm font-black tracking-tight mt-1 whitespace-nowrap ${
              unpaidCommitments.length > 0 ? 'text-amber-600' : 'text-slate-800'
            }`}>
              {unpaidCommitments.length}
            </p>
          </div>
        </div>

        {/* Unpaid list */}
        <div className="mb-4">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-500" /> Coming up ({unpaidCommitments.length})
          </p>

          {unpaidCommitments.length === 0 ? (
            <div className="text-xs font-medium text-emerald-700 p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              You've paid everything for this month.
            </div>
          ) : (
            <div className="space-y-2">
              {unpaidCommitments.map(comm => {
                const timing = getCommitmentTiming(comm.due_day_of_month)
                const isOverdue = timing.kind === 'overdue'
                const pill = getStatusPill(timing)
                const account = getAccount(comm.account_id)
                const accountBalance = account?.balance ?? 0
                const accountShort = comm.amount > accountBalance

                return (
                  <div
                    key={comm.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl transition-all border shadow-sm gap-3 sm:gap-4 ${
                      isOverdue ? 'bg-red-50/50 border-red-200'
                      : accountShort ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {/* Left */}
                    <div className="flex flex-col gap-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {isOverdue ? (
                          <div className="bg-red-100 p-1.5 rounded-lg text-red-600 shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap uppercase tracking-wider ${pill.color}`}>
                            {pill.label}
                          </span>
                        )}
                        <span className="text-sm font-bold text-slate-800 truncate">
                          {comm.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 pl-1 flex-wrap">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>
                          Deducts from:{' '}
                          <strong className="text-slate-700">{account?.account_name || 'Unknown'}</strong>
                        </span>
                        <span className="text-slate-300">·</span>
                        <Wallet className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className={accountShort ? 'text-amber-700 font-semibold' : ''}>
                          {formatMYR(accountBalance)} available
                        </span>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                      <span className="text-sm font-black whitespace-nowrap text-slate-900">
                        {formatMYR(comm.amount)}
                      </span>

                      {onMarkAsPaid && (
                        <button
                          onClick={() => setMarking(comm)}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all shadow-sm disabled:opacity-50"
                          style={{ minHeight: 44 }}
                        >
                          <Check className="w-3.5 h-3.5" /> Mark as paid
                        </button>
                      )}
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
              className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors shadow-sm group"
              aria-expanded={showPaid}
            >
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Paid this month ({paidCommitments.length})
              </span>
              {showPaid
                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            <div className={`grid transition-all duration-300 ease-in-out ${showPaid ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden space-y-1.5">
                {paidCommitments.map(comm => (
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
                      {onUnmarkAsPaid && (
                        <button
                          onClick={() => {
                            if (window.confirm(
                              `Undo payment for "${comm.name}"?\n\nThis will remove the logged expense and reset the bill to unpaid.`
                            )) {
                              onUnmarkAsPaid(comm.id)
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-700 hover:bg-white px-2 py-1.5 rounded-md transition-colors border border-transparent hover:border-slate-200"
                          style={{ minHeight: 32 }}
                          aria-label={`Undo payment for ${comm.name}`}
                        >
                          <Undo2 className="w-3 h-3" /> Undo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Paused */}
        {inactiveCommitments.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setShowInactive(!showInactive)}
              className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors shadow-sm group"
              aria-expanded={showInactive}
            >
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Power className="w-3.5 h-3.5 text-slate-400" /> Paused ({inactiveCommitments.length})
              </span>
              {showInactive
                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            <div className={`grid transition-all duration-300 ease-in-out ${showInactive ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden space-y-1.5">
                {inactiveCommitments.map(comm => (
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
                        onClick={() => onToggleCommitment(comm.id, comm.is_active)}
                        className="flex items-center justify-center w-10 h-10 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all border border-transparent hover:border-emerald-200"
                        aria-label={`Reactivate ${comm.name}`}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      {onDeleteCommitment && (
                        <button
                          onClick={() => onDeleteCommitment(comm.id, comm.name)}
                          className="flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-200"
                          aria-label={`Delete ${comm.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Shortfall notice */}
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
          commitment={marking}
          accounts={accounts}
          saving={saving}
          onConfirm={handleMarkPaidConfirm}
          onCancel={() => setMarking(null)}
        />
      )}
    </>
  )
}