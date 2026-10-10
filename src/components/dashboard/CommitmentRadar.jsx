// src/components/dashboard/CommitmentRadar.jsx
import { useState, useMemo } from 'react'
import {
  Target, ShieldCheck, AlertTriangle, Calendar, Plus, CheckCircle,
  ChevronDown, ChevronUp, ChevronRight, Power, Trash2,
  CircleSlash, AlertOctagon, Pencil, Loader2,
  Layers, List
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { monthShortName, toMYDate, dayKey, dueDateForMonth } from '../../utils/dateHelpers'
import { isPeriodPaid, isPeriodSkipped } from '../../utils/commitments/commitmentPayments'
import { MarkPaidSheet } from './MarkPaidSheet'
import { CommitmentFormSheet } from '../commitments/CommitmentFormSheet'
import { ConfirmSheet } from '../shared/ConfirmSheet'
import { BillsCalendar } from '../commitments/BillsCalendar'
import { BillRow } from './BillRow'
import { PaidBillRow } from './PaidBillRow'
import { AllBillsRow } from './AllBillsRow'

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
  const [showAllBills, setShowAllBills] = useState(false)
  const [allBillsFilter, setAllBillsFilter] = useState('all')
  const [showUpcoming, setShowUpcoming] = useState(true)
  const [marking, setMarking] = useState(null)
  const [markPaidError, setMarkPaidError] = useState(null)
  const [formState, setFormState] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const [selectedDate, setSelectedDate] = useState(() => dayKey(new Date()))

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

  const todayKey = dayKey(new Date())

  const activeAll = commitments.filter((c) => c.is_active)

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

  const paidCountByCommitment = useMemo(() => {
    const map = new Map()
    for (const p of payments) {
      if (p.status !== 'paid') continue
      map.set(p.commitment_id, (map.get(p.commitment_id) || 0) + 1)
    }
    return map
  }, [payments])

  // ------------------------------------------------------------
  // All bills
  // ------------------------------------------------------------
  const sortedAllBills = useMemo(() => {
    const active = commitments.filter(c => c.is_active)
    const inactive = commitments.filter(c => !c.is_active)

    const byDueDay = (a, b) => (a.due_day_of_month ?? 0) - (b.due_day_of_month ?? 0)
    const byCreated = (a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)

    const sortFn = (a, b) => {
      const dueDiff = byDueDay(a, b)
      return dueDiff !== 0 ? dueDiff : byCreated(a, b)
    }

    return [...active.sort(sortFn), ...inactive.sort(sortFn)]
  }, [commitments])

  const hasAnyBnpl = useMemo(
    () => commitments.some(c => c.kind === 'bnpl'),
    [commitments]
  )

  const filteredAllBills = useMemo(() => {
    if (allBillsFilter === 'all') return sortedAllBills
    return sortedAllBills.filter(c => c.kind === allBillsFilter)
  }, [sortedAllBills, allBillsFilter])

  const allBillsSummary = useMemo(() => {
    const contributes = (comm) => {
      if (!comm.is_active) return false
      if (comm.kind === 'bnpl' && comm.term_months != null) {
        const paid = paidCountByCommitment.get(comm.id) || 0
        if (paid >= comm.term_months) return false
      }
      return true
    }

    const activeCount = sortedAllBills.filter(c => c.is_active).length
    const pausedCount = sortedAllBills.length - activeCount

    const recurringList = sortedAllBills.filter(c => c.kind !== 'bnpl')
    const bnplList = sortedAllBills.filter(c => c.kind === 'bnpl')

    const recurringTotal = recurringList
      .filter(contributes)
      .reduce((s, c) => s + (Number(c.amount) || 0), 0)
    const bnplTotal = bnplList
      .filter(contributes)
      .reduce((s, c) => s + (Number(c.amount) || 0), 0)

    return {
      totalCount: sortedAllBills.length,
      activeCount,
      pausedCount,
      recurringCount: recurringList.length,
      recurringActiveCount: recurringList.filter(c => c.is_active).length,
      bnplCount: bnplList.length,
      bnplActiveCount: bnplList.filter(c => c.is_active).length,
      recurringTotal,
      bnplTotal,
      combinedTotal: recurringTotal + bnplTotal
    }
  }, [sortedAllBills, paidCountByCommitment])

  // ------------------------------------------------------------
  // Filtering (selected day + upcoming)
  // ------------------------------------------------------------
  const selectedPeriods = useMemo(() => {
    return scheduleSafe.unpaidPeriods.filter(
      (p) => dayKey(p.dueDate) === selectedDate
    )
  }, [scheduleSafe.unpaidPeriods, selectedDate])

  const otherPeriods = useMemo(() => {
    return scheduleSafe.unpaidPeriods
      .filter((p) => dayKey(p.dueDate) !== selectedDate)
      .sort((a, b) => {
        if (a.daysOverdue !== b.daysOverdue) return b.daysOverdue - a.daysOverdue
        if (a.dueDate.getTime() !== b.dueDate.getTime()) {
          return a.dueDate - b.dueDate
        }
        return b.amount - a.amount
      })
  }, [scheduleSafe.unpaidPeriods, selectedDate])

  const nextUpcomingPeriod = useMemo(() => {
    return otherPeriods.find(p => p.daysOverdue === 0) || otherPeriods[0] || null
  }, [otherPeriods])

  const paidByDueDate = useMemo(() => {
    return paidCommitments.map((comm) => {
      const pmt = payments.find(
        (p) =>
          p.commitment_id === comm.id &&
          p.period_year === currentYear &&
          p.period_month === currentMonth &&
          p.status === 'paid'
      )
      if (!pmt) return { comm, dueKey: null }
      const due = dueDateForMonth(
        comm.due_day_of_month,
        pmt.period_year,
        pmt.period_month - 1
      )
      return { comm, dueKey: dayKey(due) }
    })
  }, [paidCommitments, payments, currentYear, currentMonth])

  const paidPeriodsForSelectedDate = useMemo(
    () => paidByDueDate.filter((x) => x.dueKey === selectedDate).map((x) => x.comm),
    [paidByDueDate, selectedDate]
  )

  const otherPaidCommitments = useMemo(
    () => paidByDueDate.filter((x) => x.dueKey !== selectedDate).map((x) => x.comm),
    [paidByDueDate, selectedDate]
  )

  const selectedDayTotal = useMemo(
    () => selectedPeriods.reduce((s, p) => s + p.amount, 0),
    [selectedPeriods]
  )

  const selectedDayCount = selectedPeriods.length + paidPeriodsForSelectedDate.length
  const hasAnythingOnDay = selectedDayCount > 0

  const handleSelectDate = (key) => {
    setSelectedDate(key)
  }

  const selectedHeaderLabel = useMemo(() => {
    if (selectedDate === todayKey) return 'Today'
    const d = new Date(`${selectedDate}T12:00:00+08:00`)
    return d.toLocaleDateString('en-MY', {
      weekday: 'short', day: 'numeric', month: 'short'
    })
  }, [selectedDate, todayKey])

  // ------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // Menu action builders — keep row components dumb
  // ------------------------------------------------------------
  const billMenuActions = (comm, period) => [
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

  const allBillsMenuActions = (comm) => {
    const isPaused = !comm.is_active
    return [
      {
        label: 'Edit',
        icon: <Pencil className="w-3.5 h-3.5" />,
        onClick: () => setFormState({ mode: 'edit', commitment: comm })
      },
      {
        label: isPaused ? 'Reactivate' : 'Pause',
        icon: <Power className="w-3.5 h-3.5" />,
        onClick: () => {
          if (isPaused) onReactivateCommitment(comm.id)
          else setConfirm({ kind: 'pause', commitment: comm })
        }
      },
      {
        label: 'Delete',
        icon: <Trash2 className="w-3.5 h-3.5" />,
        danger: true,
        onClick: () => setConfirm({ kind: 'delete', commitment: comm })
      }
    ]
  }

  // ------------------------------------------------------------
  // Early returns
  // ------------------------------------------------------------
  if (loading) {
    return (
      <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-center py-10 text-fg-subtle">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2 text-sm font-medium">Loading bills…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-surface/60 backdrop-blur-xl border border-danger-border rounded-3xl p-6 shadow-sm">
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
        <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 mb-5">
            <div className="p-2.5 rounded-xl bg-surface-2 text-fg-muted">
              <Layers className="w-5 h-5" />
            </div>
            <span className="font-bold text-base text-fg">Bills</span>
          </div>

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

  // ------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------
  return (
    <>
      <div
        className={`bg-surface/60 backdrop-blur-xl border rounded-3xl p-5 md:p-6 shadow-sm overflow-hidden transition-all duration-300 ${
          isSafe ? 'border-line/50' : 'border-danger-border'
        }`}
      >
        {/* Card header */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-2.5 rounded-xl bg-surface-2 text-fg-muted shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <span className="font-bold text-base text-fg truncate">Bills</span>
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
          <div className="mb-4 bg-warning-soft border border-warning-border rounded-xl p-3.5">
            <div className="space-y-3">
              {scheduleSafe.accountShortfalls.map((sf, idx) => (
                <div
                  key={sf.accountId}
                  className={idx > 0 ? 'pt-3 border-t border-warning-border/50' : ''}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-warning-text">
                        {sf.accountName} is short by {formatMYR(sf.shortfall)}
                      </p>
                      <p className="text-[11px] text-warning-text/90 mt-0.5 leading-relaxed">
                        Move {formatMYR(sf.shortfall)} into {sf.accountName} before its bills are due.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isSafe && scheduleSafe.accountShortfalls.length > 1 && (
              <p className="text-[11px] text-warning-text/80 italic mt-3 pt-3 border-t border-warning-border/50">
                Overall balance covers it — just spread across the wrong accounts.
              </p>
            )}
          </div>
        )}

        {/* Calendar strip */}
        <div className="mb-4">
          <BillsCalendar
            schedule={scheduleSafe}
            payments={payments}
            commitments={commitments}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            todayKey={todayKey}
          />
        </div>

        {/* All done? */}
        {scheduleSafe.unpaidPeriods.length === 0 ? (
          <div className="text-xs font-medium text-success-text p-3.5 bg-success-soft border border-success-border rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success shrink-0" />
            You've handled everything for this month.
          </div>
        ) : (
          <>
            {/* SECTION 1 — Bills on the selected day */}
            <div className="mb-4">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <p className="text-[10px] text-fg-subtle uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand" />
                  {selectedHeaderLabel}
                  {hasAnythingOnDay && (
                    <span className="text-fg-muted">({selectedDayCount})</span>
                  )}
                </p>
                {selectedDayTotal > 0 && (
                  <span className="text-[10px] font-bold text-fg-muted tabular-nums">
                    {formatMYR(selectedDayTotal)} due
                  </span>
                )}
              </div>

              {!hasAnythingOnDay ? (
                <div className="text-center p-6 bg-surface-2/40 border border-dashed border-line-strong rounded-xl">
                  <p className="text-xs font-bold text-fg-muted">
                    Nothing due on this day.
                  </p>
                  {nextUpcomingPeriod && (
                    <button
                      type="button"
                      onClick={() => handleSelectDate(dayKey(nextUpcomingPeriod.dueDate))}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:text-brand-hover transition-colors"
                    >
                      Next: {nextUpcomingPeriod.commitment.name} ·{' '}
                      {toMYDate(nextUpcomingPeriod.dueDate).toLocaleDateString('en-MY', {
                        weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'
                      })}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedPeriods.map((period) => (
                    <BillRow
                      key={`${period.commitmentId}-${period.periodYear}-${period.periodMonth}`}
                      period={period}
                      account={getAccount(period.accountId)}
                      paidCount={paidCountByCommitment.get(period.commitmentId) || 0}
                      saving={saving}
                      onMarkPaid={() => {
                        setMarkPaidError(null)
                        setMarking(period)
                      }}
                      onSkip={() =>
                        setConfirm({
                          kind: 'skip',
                          commitment: period.commitment,
                          period
                        })
                      }
                      menuActions={billMenuActions(period.commitment, period)}
                    />
                  ))}
                  {paidPeriodsForSelectedDate.map((comm) => (
                    <PaidBillRow
                      key={`paid-${comm.id}`}
                      commitment={comm}
                      account={getAccount(comm.account_id)}
                      saving={saving}
                      onUndo={() => setConfirm({ kind: 'undo', commitment: comm })}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2 — Upcoming */}
            {otherPeriods.length > 0 && (
              <div className="mb-2">
                <button
                  onClick={() => setShowUpcoming(!showUpcoming)}
                  className="w-full flex items-center justify-between p-3 bg-surface hover:bg-surface-2 border border-line rounded-xl transition-colors shadow-sm"
                  aria-expanded={showUpcoming}
                  style={{ minHeight: 44 }}
                >
                  <span className="text-[10px] text-fg-muted uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-fg-subtle" /> Upcoming (
                    {otherPeriods.length})
                  </span>
                  {showUpcoming
                    ? <ChevronUp className="w-4 h-4 text-fg-subtle" />
                    : <ChevronDown className="w-4 h-4 text-fg-subtle" />}
                </button>

                {showUpcoming && (
                  <div className="mt-2 space-y-2">
                    {otherPeriods.map((period) => (
                      <BillRow
                        key={`${period.commitmentId}-${period.periodYear}-${period.periodMonth}`}
                        period={period}
                        account={getAccount(period.accountId)}
                        paidCount={paidCountByCommitment.get(period.commitmentId) || 0}
                        saving={saving}
                        onMarkPaid={() => {
                          setMarkPaidError(null)
                          setMarking(period)
                        }}
                        onSkip={() =>
                          setConfirm({
                            kind: 'skip',
                            commitment: period.commitment,
                            period
                          })
                        }
                        menuActions={billMenuActions(period.commitment, period)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Paid this month */}
        {otherPaidCommitments.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setShowPaid(!showPaid)}
              className="w-full flex items-center justify-between p-3 bg-surface hover:bg-surface-2 border border-line rounded-xl transition-colors shadow-sm"
              aria-expanded={showPaid}
              style={{ minHeight: 44 }}
            >
              <span className="text-[10px] text-fg-muted uppercase font-bold tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-success" /> Paid this month (
                {otherPaidCommitments.length})
              </span>
              {showPaid ? <ChevronUp className="w-4 h-4 text-fg-subtle" /> : <ChevronDown className="w-4 h-4 text-fg-subtle" />}
            </button>

            {showPaid && (
              <div className="mt-2 space-y-1.5">
                {otherPaidCommitments.map((comm) => (
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

        {/* All bills */}
        {sortedAllBills.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setShowAllBills(!showAllBills)}
              className="w-full flex items-center justify-between p-3 bg-surface hover:bg-surface-2 border border-line rounded-xl transition-colors shadow-sm"
              aria-expanded={showAllBills}
              style={{ minHeight: 44 }}
            >
              <span className="text-[10px] text-fg-muted uppercase font-bold tracking-wider flex items-center gap-1.5">
                <List className="w-3.5 h-3.5 text-fg-subtle" />
                All bills ({allBillsSummary.totalCount})
              </span>
              {showAllBills
                ? <ChevronUp className="w-4 h-4 text-fg-subtle" />
                : <ChevronDown className="w-4 h-4 text-fg-subtle" />}
            </button>

            {showAllBills && (
              <div className="mt-2 animate-fadeIn">
                <div className="px-3 pb-2 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[11px] text-fg-subtle">
                    {allBillsFilter === 'all' && (
                      <>
                        {allBillsSummary.totalCount}{' '}
                        {allBillsSummary.totalCount === 1 ? 'bill' : 'bills'}
                        <span className="text-line-strong mx-1.5">·</span>
                        <span className="font-bold text-fg-muted">
                          {formatMYR(allBillsSummary.combinedTotal)}/month
                        </span>
                        {allBillsSummary.bnplCount > 0 && (
                          <>
                            <span className="text-line-strong mx-1.5">·</span>
                            <span className="font-bold text-purple">
                              {allBillsSummary.bnplCount} BNPL
                            </span>
                          </>
                        )}
                      </>
                    )}

                    {allBillsFilter === 'recurring' && (
                      <>
                        {allBillsSummary.recurringCount} recurring
                        <span className="text-line-strong mx-1.5">·</span>
                        <span className="font-bold text-fg-muted">
                          {formatMYR(allBillsSummary.recurringTotal)}/month
                        </span>
                        {allBillsSummary.recurringActiveCount < allBillsSummary.recurringCount && (
                          <>
                            <span className="text-line-strong mx-1.5">·</span>
                            {allBillsSummary.recurringCount - allBillsSummary.recurringActiveCount}{' '}
                            paused
                          </>
                        )}
                      </>
                    )}

                    {allBillsFilter === 'bnpl' && (
                      <>
                        {allBillsSummary.bnplCount} BNPL
                        <span className="text-line-strong mx-1.5">·</span>
                        <span className="font-bold text-purple">
                          {formatMYR(allBillsSummary.bnplTotal)}/month
                        </span>
                        {allBillsSummary.bnplActiveCount < allBillsSummary.bnplCount && (
                          <>
                            <span className="text-line-strong mx-1.5">·</span>
                            {allBillsSummary.bnplCount - allBillsSummary.bnplActiveCount}{' '}
                            paused
                          </>
                        )}
                      </>
                    )}
                  </p>

                  {hasAnyBnpl && (
                    <div className="flex items-center gap-1">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'recurring', label: 'Recurring' },
                        { id: 'bnpl', label: 'BNPL' }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setAllBillsFilter(opt.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            allBillsFilter === opt.id
                              ? 'bg-fg text-fg-inverse'
                              : 'bg-surface-2 text-fg-subtle hover:text-fg-muted'
                          }`}
                          style={{ minHeight: 28 }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {filteredAllBills.length === 0 ? (
                  <div className="text-center py-6 text-xs text-fg-subtle">
                    No {allBillsFilter === 'bnpl' ? 'BNPL plans' : 'recurring bills'} in this list.
                  </div>
                ) : (
                  <div className="bg-surface-2/40 border border-line rounded-xl divide-y divide-line overflow-hidden">
                    {filteredAllBills.map((comm) => (
                      <AllBillsRow
                        key={`all-${comm.id}`}
                        commitment={comm}
                        paidCount={paidCountByCommitment.get(comm.id) || 0}
                        menuActions={allBillsMenuActions(comm)}
                      />
                    ))}
                  </div>
                )}
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
              if (confirm.commitment.kind === 'bnpl') {
                lines.push('This BNPL plan and its payment history will be removed.')
              } else if (n > 0) {
                lines.push(`This bill has ${n} payment${n === 1 ? '' : 's'} recorded.`)
              }
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