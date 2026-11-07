// src/components/analytics/PatternViews.jsx
import { useState, useMemo, useRef, useEffect } from 'react'
import { 
  BarChart3, ChevronLeft, ChevronRight, Calendar, 
  TrendingUp, Edit2, X, Sparkles
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import {
  toMYDate, WEEKDAY_LABELS, daysInMonth, dayKey,
  nextPayday, daysBetweenMY, getPayCycle
} from '../../utils/dateHelpers'
import { isCommitmentPayment, trimmedMean } from '../../utils/analytics/burnRateEngine'
import { computeCommitmentSchedule } from '../../utils/commitments/commitmentSchedule'
import { useChartTheme } from '../../hooks/useChartTheme'
import { EmptyState } from './AnalyticsShared'
import { AccountCard } from '../shared/AccountCard'

const formatDateMY = (dateKey, fallbackDay) => {
  if (!dateKey) return `Day ${fallbackDay}`
  try {
    const parts = dateKey.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const dt = new Date(Date.UTC(year, month, day))
      return dt.toLocaleDateString('en-MY', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      })
    }
  } catch {
    /* ignore */
  }
  return `Day ${fallbackDay}`
}

// ============================================================
// 1. Categorized Day Transactions Drilldown (No-Card Look)
// ============================================================
const DayCategorizedTransactions = ({
  cell,
  dailyLimit,
  accounts = [],
  onClose
}) => {
  const theme = useChartTheme()

  const formattedDate = useMemo(() => {
    return formatDateMY(cell?.key, cell?.day)
  }, [cell?.key, cell?.day])

  const accountFor = (id) => accounts.find((a) => a.id === id)

  // Group transactions on this day by category
  const categorized = useMemo(() => {
    if (!cell?.txns || cell.txns.length === 0) return []

    const map = new Map()
    cell.txns.forEach((tx) => {
      const fullCat = tx.category || 'Uncategorized'
      const parts = fullCat.split(' > ')
      const mainCat = parts[0].trim()
      const subCat = parts.length > 1 ? parts.slice(1).join(' > ').trim() : null

      if (!map.has(mainCat)) {
        map.set(mainCat, {
          name: mainCat,
          total: 0,
          txns: []
        })
      }
      const group = map.get(mainCat)
      group.total += Number(tx.amount || 0)
      group.txns.push({ ...tx, subCat })
    })

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .map((group) => ({
        ...group,
        txns: group.txns.sort((a, b) => {
          const dateDiff =
            new Date(b.transaction_date).getTime() -
            new Date(a.transaction_date).getTime()
          if (dateDiff !== 0) return dateDiff
          return Number(b.amount || 0) - Number(a.amount || 0)
        })
      }))
  }, [cell])

  if (!cell) return null

  const isOver = cell.total > dailyLimit
  const diff = Math.abs(cell.total - dailyLimit)

  return (
    <div className="mt-8 pt-6 border-t border-line/60 animate-fadeIn space-y-4">
      {/* Header (No-Card Look: seamless inline header) */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-bold text-fg">{formattedDate}</h4>
            {cell.total > 0 && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isOver
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOver ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 animate-pulse'
                  }`}
                />
                {isOver
                  ? `+${formatMYR(diff)} over target`
                  : `${formatMYR(diff)} under target`}
              </span>
            )}
            {cell.total === 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                No spending
              </span>
            )}
          </div>

          <p className="text-xs text-fg-muted mt-1">
            <strong className="text-fg tabular-figures font-black text-sm">
              {formatMYR(cell.total)}
            </strong>
            {cell.txns.length > 0 && (
              <span className="text-fg-subtle">
                {` · ${cell.txns.length} purchase${cell.txns.length === 1 ? '' : 's'}`}
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-xs font-bold text-fg-subtle hover:text-fg px-3 py-1.5 rounded-lg hover:bg-surface-2 transition-colors shrink-0 cursor-pointer"
          aria-label="Close day breakdown"
        >
          Close
        </button>
      </div>

      {/* Transaction List (No card look: unboxed rows directly on page) */}
      {cell.txns.length === 0 ? (
        <div className="py-8 text-center text-xs text-fg-muted">
          No expenses recorded on this day.
        </div>
      ) : (
        <div className="space-y-5 pt-1">
          {categorized.map((group, idx) => {
            const catColor =
              theme.category[idx % theme.category.length] || theme.current
            const pct = cell.total > 0 ? (group.total / cell.total) * 100 : 0

            return (
              <div key={group.name} className="space-y-1.5">
                {/* Category Section Header */}
                <div className="flex items-center justify-between py-2 border-b border-line/30">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: catColor }}
                    />
                    <span className="text-xs font-bold text-fg">
                      {group.name}
                    </span>
                    <span className="text-[10px] font-semibold text-fg-subtle">
                      ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <span className="text-xs font-bold text-fg tabular-figures">
                    {formatMYR(group.total)}
                  </span>
                </div>

                {/* Transactions under this category */}
                <div className="divide-y divide-line/15">
                  {group.txns.map((tx, txIdx) => {
                    const sourceAcc = accountFor(tx.source_account_id)
                    return (
                      <div
                        key={tx.id || `${group.name}-${txIdx}`}
                        className="flex items-center justify-between gap-3 py-2.5 px-1 hover:bg-surface-2/30 transition-all rounded-lg"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <p className="text-xs font-bold text-fg truncate">
                            {tx.description || 'Untitled'}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-fg-subtle min-w-0">
                            {tx.subCat && (
                              <span className="truncate max-w-[120px]">
                                {tx.subCat}
                              </span>
                            )}
                            {tx.subCat && sourceAcc && (
                              <span className="text-line-strong shrink-0">•</span>
                            )}
                            {sourceAcc && (
                              <AccountCard
                                account={sourceAcc}
                                size="chip"
                                showIcon={false}
                              />
                            )}
                            {tx.notes && (
                              <>
                                <span className="text-line-strong shrink-0">•</span>
                                <span className="italic truncate max-w-[150px]">
                                  "{tx.notes}"
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className="text-xs font-bold tabular-figures text-fg shrink-0">
                          -{formatMYR(tx.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// 2. Weekly Transactions Drilldown (No-Card Look)
// ============================================================
const WeekCategorizedTransactions = ({ txns = [], accounts = [] }) => {
  const theme = useChartTheme()
  const accountFor = (id) => accounts.find((a) => a.id === id)

  const categorized = useMemo(() => {
    if (!txns || txns.length === 0) return []

    const map = new Map()
    txns.forEach((tx) => {
      const fullCat = tx.category || 'Uncategorized'
      const parts = fullCat.split(' > ')
      const mainCat = parts[0].trim()
      const subCat = parts.length > 1 ? parts.slice(1).join(' > ').trim() : null

      if (!map.has(mainCat)) {
        map.set(mainCat, {
          name: mainCat,
          total: 0,
          txns: []
        })
      }
      const group = map.get(mainCat)
      group.total += Number(tx.amount || 0)
      group.txns.push({ ...tx, subCat })
    })

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .map((group) => ({
        ...group,
        txns: group.txns.sort((a, b) => {
          const dateDiff =
            new Date(b.transaction_date).getTime() -
            new Date(a.transaction_date).getTime()
          if (dateDiff !== 0) return dateDiff
          return Number(b.amount || 0) - Number(a.amount || 0)
        })
      }))
  }, [txns])

  if (txns.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-fg-muted">
        No expenses recorded this week.
      </div>
    )
  }

  const weekTotal = txns.reduce((s, tx) => s + (Number(tx.amount) || 0), 0)

  return (
    <div className="space-y-5 pt-1">
      {categorized.map((group, idx) => {
        const catColor = theme.category[idx % theme.category.length] || theme.current
        const pct = weekTotal > 0 ? (group.total / weekTotal) * 100 : 0

        return (
          <div key={group.name} className="space-y-1.5">
            <div className="flex items-center justify-between py-2 border-b border-line/30">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: catColor }}
                />
                <span className="text-xs font-bold text-fg">{group.name}</span>
                <span className="text-[10px] font-semibold text-fg-subtle">
                  ({pct.toFixed(0)}%)
                </span>
              </div>
              <span className="text-xs font-bold text-fg tabular-figures">
                {formatMYR(group.total)}
              </span>
            </div>

            <div className="divide-y divide-line/15">
              {group.txns.map((tx, txIdx) => {
                const sourceAcc = accountFor(tx.source_account_id)
                const txDateLabel = toMYDate(tx.transaction_date).toLocaleDateString('en-MY', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'UTC'
                })

                return (
                  <div
                    key={tx.id || `${group.name}-${txIdx}`}
                    className="flex items-center justify-between gap-3 py-2.5 px-1 hover:bg-surface-2/30 transition-all rounded-lg"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <p className="text-xs font-bold text-fg truncate">
                        {tx.description || 'Untitled'}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-fg-subtle min-w-0">
                        <span>{txDateLabel}</span>
                        <span className="text-line-strong shrink-0">•</span>
                        {tx.subCat && (
                          <span className="truncate max-w-[120px]">{tx.subCat}</span>
                        )}
                        {tx.subCat && sourceAcc && (
                          <span className="text-line-strong shrink-0">•</span>
                        )}
                        {sourceAcc && (
                          <AccountCard
                            account={sourceAcc}
                            size="chip"
                            showIcon={false}
                          />
                        )}
                        {tx.notes && (
                          <>
                            <span className="text-line-strong shrink-0">•</span>
                            <span className="italic truncate max-w-[150px]">
                              "{tx.notes}"
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-bold tabular-figures text-fg shrink-0">
                      -{formatMYR(tx.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// 3. Weekly Cycle Comparison (Last Cycle vs This Cycle)
// ============================================================
const WeeklyCycleComparison = ({
  expenses = [],
  accounts = [],
  profile
}) => {
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(null)
  const [drilldownCycle, setDrilldownCycle] = useState('this') // 'this' | 'last'
  const drilldownRef = useRef(null)

  const now = useMemo(() => new Date(), [])

  // Build cycle comparisons
  const cycleData = useMemo(() => {
    const thisCycle = getPayCycle(now, profile?.payday_type, profile?.payday_date)
    const prevEndSeed = new Date(thisCycle.startDate.getTime() - 86400000)
    const lastCycle = getPayCycle(prevEndSeed, profile?.payday_type, profile?.payday_date)

    const buildWeeks = (cycle, isCurrentCycle) => {
      const startMs = cycle.startDate.getTime()
      const endMs = cycle.endDate.getTime()
      const nowMs = now.getTime()
      const totalDays = Math.max(1, Math.ceil((endMs - startMs + 1) / 86400000))
      const count = Math.ceil(totalDays / 7)

      const list = []
      for (let i = 0; i < count; i++) {
        const wStart = new Date(startMs + i * 7 * 86400000)
        const wEnd = new Date(Math.min(endMs, startMs + (i + 1) * 7 * 86400000 - 1))

        const isCompleted = isCurrentCycle ? nowMs > wEnd.getTime() : true
        const isCurrent = isCurrentCycle ? nowMs >= wStart.getTime() && nowMs <= wEnd.getTime() : false
        const isUpcoming = isCurrentCycle ? nowMs < wStart.getTime() : false

        let elapsedDays = 7
        if (isCurrent) {
          elapsedDays = Math.max(1, Math.min(7, Math.ceil((nowMs - wStart.getTime() + 1) / 86400000)))
        } else if (isUpcoming) {
          elapsedDays = 0
        }

        const weekTxns = (expenses || []).filter((tx) => {
          const txMs = new Date(tx.transaction_date).getTime()
          return txMs >= wStart.getTime() && txMs <= wEnd.getTime()
        })

        const total = weekTxns.reduce((s, tx) => s + (Number(tx.amount) || 0), 0)

        const startLabel = toMYDate(wStart).toLocaleDateString('en-MY', {
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC'
        })
        const endLabel = toMYDate(wEnd).toLocaleDateString('en-MY', {
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC'
        })

        list.push({
          index: i,
          weekNum: i + 1,
          label: `Week ${i + 1}`,
          dateRange: `${startLabel} – ${endLabel}`,
          startDate: wStart,
          endDate: wEnd,
          isCompleted,
          isCurrent,
          isUpcoming,
          elapsedDays,
          total,
          txns: weekTxns
        })
      }
      return list
    }

    const thisWeeks = buildWeeks(thisCycle, true)
    const lastWeeks = buildWeeks(lastCycle, false)

    const maxWeeks = Math.max(thisWeeks.length, lastWeeks.length)
    const comparisons = []

    let thisCycleSoFar = 0
    let lastCycleSamePeriod = 0

    for (let i = 0; i < maxWeeks; i++) {
      const tw = thisWeeks[i] || null
      const lw = lastWeeks[i] || null

      let lastPaced = lw ? lw.total : 0
      if (tw?.isCurrent && lw) {
        const pacedEndMs = lw.startDate.getTime() + tw.elapsedDays * 86400000
        const pacedTxns = lw.txns.filter((t) => new Date(t.transaction_date).getTime() <= pacedEndMs)
        lastPaced = pacedTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0)
      }

      if (tw && !tw.isUpcoming) {
        thisCycleSoFar += tw.total
        lastCycleSamePeriod += tw.isCurrent ? lastPaced : (lw ? lw.total : 0)
      }

      const thisVal = tw ? tw.total : 0
      const lastVal = lw ? lw.total : 0
      const benchmarkVal = tw?.isCurrent ? lastPaced : lastVal
      const diff = tw?.isCurrent ? thisVal - lastPaced : thisVal - lastVal
      const pct = benchmarkVal > 0 ? (diff / benchmarkVal) * 100 : 0

      comparisons.push({
        index: i,
        weekNum: i + 1,
        thisWeek: tw,
        lastWeek: lw,
        thisVal,
        lastVal,
        lastPaced,
        diff,
        pct,
        isCurrent: tw?.isCurrent || false,
        isCompleted: tw?.isCompleted || false,
        isUpcoming: tw?.isUpcoming || false
      })
    }

    const maxVal = Math.max(
      ...comparisons.map((c) => Math.max(c.thisVal, c.lastVal)),
      1
    )

    const cycleDiff = thisCycleSoFar - lastCycleSamePeriod

    return {
      comparisons,
      maxVal,
      thisCycleSoFar,
      lastCycleSamePeriod,
      cycleDiff
    }
  }, [now, profile, expenses])

  useEffect(() => {
    if (selectedWeekIdx !== null && drilldownRef.current) {
      setTimeout(() => {
        drilldownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    }
  }, [selectedWeekIdx])

  const selectedComp =
    selectedWeekIdx !== null ? cycleData.comparisons[selectedWeekIdx] : null

  const activeDrilldownTxns =
    drilldownCycle === 'this'
      ? selectedComp?.thisWeek?.txns || []
      : selectedComp?.lastWeek?.txns || []

  if (!expenses || expenses.length === 0) {
    return <EmptyState icon={BarChart3} title="No cycle data yet" />
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-fg flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-solid" />
            Weekly Cycle Comparison
          </h3>
          <p className="text-xs text-fg-muted mt-0.5">
            Week-by-week pace vs last cycle
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-brand" />
            <span className="text-[10px] font-bold text-fg-muted">This cycle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-brand/25 dark:bg-brand/20" />
            <span className="text-[10px] font-bold text-fg-muted">Last cycle</span>
          </div>
        </div>
      </div>

      {/* Cycle Pace Summary (No-Card Look) */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-0.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-fg-muted font-medium">Cycle Pace:</span>
          <span className="font-bold text-fg tabular-figures">
            {formatMYR(cycleData.thisCycleSoFar)}
          </span>
          <span className="text-fg-subtle">
            vs {formatMYR(cycleData.lastCycleSamePeriod)} last cycle
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              cycleData.cycleDiff < 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : cycleData.cycleDiff > 0
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                : 'bg-surface-2 text-fg-subtle border border-line'
            }`}
          >
            {cycleData.cycleDiff < 0 ? (
              <>↓ -{formatMYR(Math.abs(cycleData.cycleDiff))}</>
            ) : cycleData.cycleDiff > 0 ? (
              <>↑ +{formatMYR(cycleData.cycleDiff)}</>
            ) : (
              <>On track</>
            )}
          </span>
        </div>
      </div>

      {/* Weekly Paired Bars Comparison Chart */}
      <div className="flex items-end justify-between gap-2 md:gap-4 h-48 pt-3">
        {cycleData.comparisons.map((c) => {
          const isSelected = selectedWeekIdx === c.index
          const thisHeight = c.thisVal > 0 ? (c.thisVal / cycleData.maxVal) * 100 : 0
          const lastHeight = c.lastVal > 0 ? (c.lastVal / cycleData.maxVal) * 100 : 0

          return (
            <button
              key={c.weekNum}
              type="button"
              onClick={() => setSelectedWeekIdx((prev) => (prev === c.index ? null : c.index))}
              className={`relative flex-1 h-full flex flex-col items-center justify-end gap-1.5 group p-2 rounded-xl transition-all cursor-pointer ${
                isSelected
                  ? 'bg-surface-2/60 ring-2 ring-brand'
                  : 'hover:bg-surface-2/30'
              }`}
              aria-label={`Week ${c.weekNum}, This cycle: ${formatMYR(c.thisVal)}, Last cycle: ${formatMYR(c.lastVal)}`}
              aria-pressed={isSelected}
            >
              {/* Metric label at top of bar */}
              <div className="text-center min-h-[30px] flex flex-col justify-end">
                <span className="text-[10px] md:text-xs font-bold text-fg tabular-figures block">
                  {c.thisVal > 0 ? formatMYR(c.thisVal) : c.isUpcoming ? '—' : 'RM 0'}
                </span>
                {!c.isUpcoming && (
                  <span
                    className={`text-[9px] md:text-[10px] font-bold tabular-figures block ${
                      c.diff < 0 ? 'text-emerald-500' : c.diff > 0 ? 'text-rose-500' : 'text-fg-subtle'
                    }`}
                  >
                    {c.diff < 0
                      ? `-${formatMYR(Math.abs(c.diff))}`
                      : c.diff > 0
                      ? `+${formatMYR(c.diff)}`
                      : '0'}
                  </span>
                )}
                {c.isUpcoming && (
                  <span className="text-[9px] text-fg-subtle block">
                    Upcoming
                  </span>
                )}
              </div>

              {/* Paired Vertical Bars */}
              <div className="flex-1 w-full flex items-end justify-center gap-1.5 max-w-[56px] py-1">
                {/* Last cycle bar */}
                <div
                  className="w-3 md:w-4 rounded-t-md bg-brand/25 dark:bg-brand/20 transition-all"
                  style={{ height: `${Math.max(lastHeight, 4)}%` }}
                  title={`Last cycle: ${formatMYR(c.lastVal)}`}
                />
                {/* This cycle bar */}
                <div
                  className={`w-3 md:w-4 rounded-t-md transition-all ${
                    c.isCurrent ? 'bg-brand shadow-sm shadow-brand/40' : 'bg-brand'
                  }`}
                  style={{
                    height: `${c.thisVal > 0 ? Math.max(thisHeight, 4) : 0}%`,
                    opacity: c.isUpcoming ? 0 : 1
                  }}
                  title={`This cycle: ${formatMYR(c.thisVal)}`}
                />
              </div>

              {/* Week labels */}
              <div className="text-center pt-1 border-t border-line/40 w-full">
                <span className="text-xs font-bold text-fg block">
                  {c.thisWeek?.label || `W${c.weekNum}`}
                </span>
                <span className="text-[9px] text-fg-subtle block truncate">
                  {c.thisWeek?.dateRange}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Week Drilldown (No-Card Look) */}
      {selectedComp && (
        <div ref={drilldownRef} className="scroll-mt-24 mt-8 pt-6 border-t border-line/60 animate-fadeIn space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-bold text-fg">Week {selectedComp.weekNum} Breakdown</h4>
                {selectedComp.isCurrent && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand/10 text-brand border border-brand/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                    Day {selectedComp.thisWeek.elapsedDays} of 7
                  </span>
                )}
                {!selectedComp.isUpcoming && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedComp.diff < 0
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : selectedComp.diff > 0
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : 'bg-surface-2 text-fg-subtle border border-line'
                    }`}
                  >
                    {selectedComp.diff < 0 ? (
                      <>↓ -{formatMYR(Math.abs(selectedComp.diff))} (-{Math.abs(selectedComp.pct).toFixed(0)}%)</>
                    ) : selectedComp.diff > 0 ? (
                      <>↑ +{formatMYR(selectedComp.diff)} (+{selectedComp.pct.toFixed(0)}%)</>
                    ) : (
                      <>On track</>
                    )}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-fg-muted">
                <span>This cycle: <strong className="text-fg tabular-figures">{formatMYR(selectedComp.thisVal)}</strong></span>
                <span>•</span>
                <span>Last cycle: <strong className="text-fg tabular-figures">{formatMYR(selectedComp.lastVal)}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-surface-2 p-0.5 border border-line text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDrilldownCycle('this')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    drilldownCycle === 'this'
                      ? 'bg-surface text-fg font-bold shadow-xs'
                      : 'text-fg-subtle hover:text-fg'
                  }`}
                >
                  This Cycle ({selectedComp.thisWeek?.txns.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDrilldownCycle('last')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    drilldownCycle === 'last'
                      ? 'bg-surface text-fg font-bold shadow-xs'
                      : 'text-fg-subtle hover:text-fg'
                  }`}
                >
                  Last Cycle ({selectedComp.lastWeek?.txns.length || 0})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWeekIdx(null)}
                className="text-xs font-bold text-fg-subtle hover:text-fg px-3 py-1.5 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          <WeekCategorizedTransactions
            txns={activeDrilldownTxns}
            accounts={accounts}
          />
        </div>
      )}
    </section>
  )
}

// ============================================================
// 4. Daily Spending Calendar (Liquid Non-Savings Pace + Heatmap Gradients)
// ============================================================
const CalendarHeatmap = ({
  expenses = [],
  income = [],
  accounts = [],
  commitments = [],
  commitmentPayments = [],
  profile
}) => {
  const theme = useChartTheme()
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDayKey, setSelectedDayKey] = useState(null)
  const drilldownRef = useRef(null)

  // Stored daily limit or null for automatic
  const [customLimit, setCustomLimit] = useState(() => {
    try {
      const saved = localStorage.getItem('analytics_daily_limit')
      return saved ? Number(saved) : null
    } catch {
      return null
    }
  })
  const [isEditingLimit, setIsEditingLimit] = useState(false)
  const [limitInput, setLimitInput] = useState('')

  // ------------------------------------------------------------
  // Spendable Liquid Cash (All accounts except savings / locked)
  // ------------------------------------------------------------
  const spendableCashData = useMemo(() => {
    const nonSavingsAccounts = (accounts || []).filter((a) => {
      if (a.is_archived) return false
      const cls = (a.classification || '').toLowerCase()
      // Exclude savings, fixed unit trusts (ASB), pilgrimage (TH), investments, and credit cards
      return !['savings', 'fixed_price_ut', 'pilgrimage', 'investment', 'credit'].includes(cls)
    })

    const nonSavingsBal = nonSavingsAccounts.reduce(
      (sum, a) => sum + (Number(a.balance) || 0),
      0
    )

    const payday = nextPayday(
      new Date(),
      () => false,
      profile?.payday_type,
      profile?.payday_date
    )
    const days = Math.max(1, daysBetweenMY(new Date(), payday))

    const schedule = computeCommitmentSchedule({
      commitments: commitments || [],
      payments: commitmentPayments || [],
      accounts: accounts || [],
      scopeAccountId: 'all',
      now: new Date(),
      horizon: payday,
      paydayType: profile?.payday_type,
      paydayDate: profile?.payday_date
    })

    const bills = schedule?.total || 0
    const freeCash = Math.max(0, nonSavingsBal - bills)

    return {
      spendableCash: freeCash,
      nonSavingsBalance: nonSavingsBal,
      unpaidBills: bills,
      daysToPayday: days,
      accountCount: nonSavingsAccounts.length
    }
  }, [accounts, commitments, commitmentPayments, profile])

  // Build month grid & spending map
  const monthData = useMemo(() => {
    const cursorMY = toMYDate(cursor)
    const year = cursorMY.getUTCFullYear()
    const monthIdx = cursorMY.getUTCMonth()
    const dim = daysInMonth(year, monthIdx)

    const totalsByDay = {}
    const txByDay = {}
    expenses.forEach((tx) => {
      const d = toMYDate(tx.transaction_date)
      if (d.getUTCFullYear() === year && d.getUTCMonth() === monthIdx) {
        const key = d.getUTCDate()
        totalsByDay[key] = (totalsByDay[key] || 0) + Number(tx.amount || 0)
        if (!txByDay[key]) txByDay[key] = []
        txByDay[key].push(tx)
      }
    })

    const nonZero = Object.values(totalsByDay).filter((v) => v > 0).sort((a, b) => a - b)
    const quantile = (q) => {
      if (nonZero.length === 0) return 0
      const idx = Math.floor(nonZero.length * q)
      return nonZero[Math.min(idx, nonZero.length - 1)]
    }
    const thresholds = [quantile(0.25), quantile(0.5), quantile(0.75), quantile(0.95)]

    const level = (amt) => {
      if (!amt || amt === 0) return 0
      if (thresholds[0] === thresholds[3]) return 2
      if (amt <= thresholds[0]) return 1
      if (amt <= thresholds[1]) return 2
      if (amt <= thresholds[2]) return 3
      return 4
    }

    const firstDay = new Date(Date.UTC(year, monthIdx, 1))
    const firstDow = firstDay.getUTCDay()
    const leadingBlanks = firstDow === 0 ? 6 : firstDow - 1

    const cells = []
    for (let i = 0; i < leadingBlanks; i++) cells.push(null)
    for (let d = 1; d <= dim; d++) {
      cells.push({
        day: d,
        key: dayKey(new Date(Date.UTC(year, monthIdx, d))),
        total: totalsByDay[d] || 0,
        level: level(totalsByDay[d] || 0),
        txns: txByDay[d] || []
      })
    }

    const monthName = firstDay.toLocaleString('en-MY', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    return { cells, monthName, totalsByDay, year, monthIdx, dim }
  }, [cursor, expenses])

  // ------------------------------------------------------------
  // Target Daily Spending Calculation:
  // 1. Manual user override (customLimit in localStorage) -> always honored.
  // 2. Current Month: Liquid Non-Savings Cash Pace
  //    (Spendable Cash in all accounts except savings) ÷ (Days to Payday)
  // 3. Month Disposable Income Allowance (if income logged):
  //    (Month Income - Commitments) ÷ (Days in Month)
  // 4. Past Months or Fallback: 90-Day Behavior Baseline
  //    Trimmed Mean (stripping top 10% splurges) * 1.25 (+25% headroom)
  // 5. Default Fallback: RM 50.00
  // ------------------------------------------------------------
  const dailyLimit = useMemo(() => {
    // 1. User manual override
    if (customLimit && customLimit > 0) return customLimit

    const todayMY = toMYDate(new Date())
    const isCurrentMonth =
      monthData.year === todayMY.getUTCFullYear() &&
      monthData.monthIdx === todayMY.getUTCMonth()

    // 2. Current Month: Liquid Non-Savings Cash Pace
    if (
      isCurrentMonth &&
      spendableCashData.spendableCash > 0 &&
      spendableCashData.daysToPayday > 0
    ) {
      const pace = spendableCashData.spendableCash / spendableCashData.daysToPayday
      if (pace >= 15) {
        return Math.max(20, Math.round(pace / 5) * 5)
      }
    }

    // 3. Month Disposable Income Allowance (if income logged)
    const monthIncome = (income || [])
      .filter((tx) => {
        const d = toMYDate(tx.transaction_date)
        return (
          d.getUTCFullYear() === monthData.year &&
          d.getUTCMonth() === monthData.monthIdx
        )
      })
      .reduce((s, tx) => s + (Number(tx.amount) || 0), 0)

    let effectiveIncome = monthIncome
    if (effectiveIncome === 0) {
      // If current month's salary hasn't arrived yet, check previous month's income
      const prevMonthIdx = monthData.monthIdx === 0 ? 11 : monthData.monthIdx - 1
      const prevYear = monthData.monthIdx === 0 ? monthData.year - 1 : monthData.year
      effectiveIncome = (income || [])
        .filter((tx) => {
          const d = toMYDate(tx.transaction_date)
          return (
            d.getUTCFullYear() === prevYear &&
            d.getUTCMonth() === prevMonthIdx
          )
        })
        .reduce((s, tx) => s + (Number(tx.amount) || 0), 0)
    }

    // Fixed commitments in the month
    const monthCommitments = (expenses || [])
      .filter((tx) => {
        const d = toMYDate(tx.transaction_date)
        return (
          d.getUTCFullYear() === monthData.year &&
          d.getUTCMonth() === monthData.monthIdx &&
          isCommitmentPayment(tx)
        )
      })
      .reduce((s, tx) => s + (Number(tx.amount) || 0), 0)

    if (effectiveIncome > 0) {
      const disposable = Math.max(0, effectiveIncome - monthCommitments)
      const dailyAllowance = disposable / monthData.dim
      if (dailyAllowance >= 15) {
        return Math.max(20, Math.round(dailyAllowance / 5) * 5)
      }
    }

    // 4. Past Months or Fallback: 90-Day Behavior Baseline
    const dailySpendValues = []

    // Collect daily everyday totals across the 90 days before cursor
    const cursorMs = new Date(Date.UTC(monthData.year, monthData.monthIdx + 1, 0)).getTime()
    const ninetyDaysBeforeMs = cursorMs - 90 * 86400000
    const historyDailyMap = new Map()

    ;(expenses || []).forEach((tx) => {
      if (isCommitmentPayment(tx)) return
      const txMs = new Date(tx.transaction_date).getTime()
      if (txMs >= ninetyDaysBeforeMs && txMs <= cursorMs) {
        const k = dayKey(tx.transaction_date)
        historyDailyMap.set(k, (historyDailyMap.get(k) || 0) + (Number(tx.amount) || 0))
      }
    })

    historyDailyMap.forEach((val) => {
      if (val > 0) dailySpendValues.push(val)
    })

    if (dailySpendValues.length >= 3) {
      const trimmed = trimmedMean(dailySpendValues)
      if (trimmed > 0) {
        const limitWithHeadroom = trimmed * 1.25 // +25% headroom
        return Math.max(20, Math.round(limitWithHeadroom / 5) * 5)
      }
    }

    // Fallback: active month's non-zero median if available
    const nonZeroThisMonth = Object.values(monthData.totalsByDay).filter((v) => v > 0)
    if (nonZeroThisMonth.length > 0) {
      const sorted = [...nonZeroThisMonth].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
      return Math.max(20, Math.round((median * 1.25) / 5) * 5)
    }

    // 5. Default Fallback
    return 50
  }, [customLimit, monthData, spendableCashData, income, expenses])

  const handleSaveLimit = () => {
    const val = parseFloat(limitInput)
    if (!isNaN(val) && val > 0) {
      setCustomLimit(val)
      try {
        localStorage.setItem('analytics_daily_limit', String(val))
      } catch {
        /* ignore */
      }
    }
    setIsEditingLimit(false)
  }

  const handleResetLimit = () => {
    setCustomLimit(null)
    try {
      localStorage.removeItem('analytics_daily_limit')
    } catch {
      /* ignore */
    }
    setIsEditingLimit(false)
  }


  // Auto-scroll to drilldown when a day is selected
  useEffect(() => {
    if (selectedDayKey !== null && drilldownRef.current) {
      setTimeout(() => {
        drilldownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    }
  }, [selectedDayKey])

  const selectedCell = monthData.cells.find((c) => c && c.day === selectedDayKey)

  const todayMY = toMYDate(new Date())
  const cursorMY = toMYDate(cursor)
  const isFutureMonth =
    cursorMY.getUTCFullYear() > todayMY.getUTCFullYear() ||
    (cursorMY.getUTCFullYear() === todayMY.getUTCFullYear() &&
      cursorMY.getUTCMonth() > todayMY.getUTCMonth())
  const isCurrentMonth =
    cursorMY.getUTCFullYear() === todayMY.getUTCFullYear() &&
    cursorMY.getUTCMonth() === todayMY.getUTCMonth()

  const go = (delta) => {
    setCursor((c) => {
      const n = new Date(c)
      n.setDate(1)
      n.setMonth(n.getMonth() + delta)
      return n
    })
    setSelectedDayKey(null)
  }

  const isCustomMode = customLimit && customLimit > 0

  return (
    <section className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-fg flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-solid" />
            Daily Spending Calendar
          </h3>
          <p className="text-xs text-fg-muted mt-0.5">{monthData.monthName}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(-1)}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Daily Target Setting Control (No-Card Look) */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-0.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-fg-muted font-medium">Daily Target:</span>
          {isEditingLimit ? (
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <span className="absolute left-2 text-xs font-bold text-fg-subtle">RM</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveLimit()
                    if (e.key === 'Escape') setIsEditingLimit(false)
                  }}
                  className="w-24 pl-8 pr-2 py-0.5 text-xs font-bold bg-surface border border-line-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="50"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={handleSaveLimit}
                className="px-2 py-0.5 text-xs font-bold bg-brand text-white rounded-md hover:opacity-90 transition-opacity cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleResetLimit}
                className="px-2 py-0.5 text-xs font-medium text-fg-subtle hover:text-fg hover:bg-surface-2 rounded-md transition-colors cursor-pointer"
                title="Reset to automatic target"
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setIsEditingLimit(false)}
                className="p-1 text-fg-subtle hover:text-fg hover:bg-surface-2 rounded-md transition-colors cursor-pointer"
                aria-label="Cancel editing"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setLimitInput(String(dailyLimit))
                setIsEditingLimit(true)
              }}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-surface-2 text-xs font-bold text-fg transition-colors group cursor-pointer"
              title={
                isCustomMode
                  ? 'Custom daily target'
                  : isCurrentMonth && spendableCashData.spendableCash > 0
                  ? `${formatMYR(spendableCashData.spendableCash)} liquid · ${spendableCashData.daysToPayday}d to payday`
                  : 'Based on 90-day baseline'
              }
            >
              <span className="tabular-figures">{formatMYR(dailyLimit)}</span>
              {!isCustomMode && (
                <span className="text-[10px] font-semibold text-brand flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Auto
                </span>
              )}
              <Edit2 className="w-3 h-3 text-fg-subtle group-hover:text-fg transition-colors" />
            </button>
          )}
        </div>

        <p className="text-[11px] text-fg-subtle">
          {isCustomMode
            ? 'Custom target'
            : isCurrentMonth && spendableCashData.spendableCash > 0
            ? `${formatMYR(spendableCashData.spendableCash)} liquid · ${spendableCashData.daysToPayday}d to payday`
            : '90-day baseline'}
        </p>
      </div>

      {/* Weekday Row */}
      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-1">
        {WEEKDAY_LABELS.map((d) => (
          <span
            key={d}
            className="text-[9px] md:text-[11px] font-bold text-fg-subtle text-center uppercase tracking-wider"
          >
            {d.slice(0, 1)}
          </span>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {monthData.cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />
          const isSelected = selectedDayKey === cell.day
          const isFuture =
            isFutureMonth || (isCurrentMonth && cell.day > todayMY.getUTCDate())
          const isOver = cell.total > dailyLimit

          return (
            <button
              key={cell.day}
              type="button"
              onClick={() =>
                !isFuture && setSelectedDayKey((prev) => (prev === cell.day ? null : cell.day))
              }
              disabled={isFuture}
              aria-label={`Day ${cell.day}, ${formatMYR(cell.total)}${
                isOver ? ', over limit' : ', within limit'
              }`}
              aria-pressed={isSelected}
              className={`relative aspect-square rounded-xl flex items-center justify-center text-[10px] md:text-sm font-bold transition-all select-none ${
                isSelected ? 'ring-2 ring-inset ring-brand-solid shadow-md scale-105 z-10' : ''
              } ${
                isFuture
                  ? 'opacity-25 cursor-not-allowed'
                  : 'hover:scale-105 hover:shadow-sm cursor-pointer active:scale-95'
              }`}
              style={{
                backgroundColor: theme.heatmap[cell.level],
                color: cell.level >= 3 ? theme.heatTextStrong : theme.heatTextLight
              }}
            >
              <span className="tabular-figures">{cell.day}</span>

              {/* Pulsing indicator dots for past & today */}
              {!isFuture && (
                isOver ? (
                  <span
                    className="absolute top-1 right-1 md:top-1.5 md:right-1.5 flex h-2 w-2"
                    title={`Over limit: ${formatMYR(cell.total)} (Limit: ${formatMYR(dailyLimit)})`}
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-sm shadow-rose-500/50" />
                  </span>
                ) : (
                  <span
                    className="absolute top-1 right-1 md:top-1.5 md:right-1.5 flex h-2 w-2"
                    title={`Within limit: ${formatMYR(cell.total)} (Limit: ${formatMYR(dailyLimit)})`}
                  >
                    <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400/80 scale-125" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                  </span>
                )
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-line/40">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-fg-subtle font-semibold">Less</span>
          <div className="flex items-center gap-1">
            {theme.heatmap.map((c, i) => (
              <div
                key={i}
                className="w-3 h-3 md:w-3.5 md:h-3.5 rounded"
                style={{ backgroundColor: c }}
                title={`Level ${i}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-fg-subtle font-semibold">More</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-[10px] text-fg-subtle font-medium">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400/80 scale-125" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            </span>
            <span>≤ {formatMYR(dailyLimit)} (Target)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-sm shadow-rose-500/50" />
            </span>
            <span>&gt; {formatMYR(dailyLimit)} (Over)</span>
          </div>
        </div>
      </div>

      {/* Categorized Day Drilldown (No-Card Look) */}
      {selectedCell && (
        <div ref={drilldownRef} className="scroll-mt-24">
          <DayCategorizedTransactions
            cell={selectedCell}
            dailyLimit={dailyLimit}
            accounts={accounts}
            onClose={() => setSelectedDayKey(null)}
          />
        </div>
      )}
    </section>
  )
}

// ============================================================
// 5. Main Trends Page Container
// ============================================================
export const PatternViews = ({
  expenses = [],
  allExpenses,
  income = [],
  accounts = [],
  commitments = [],
  commitmentPayments = [],
  profile
}) => (
  <div className="space-y-8">
    <WeeklyCycleComparison
      expenses={allExpenses || expenses}
      accounts={accounts}
      profile={profile}
    />
    <CalendarHeatmap
      expenses={allExpenses || expenses}
      income={income}
      accounts={accounts}
      commitments={commitments}
      commitmentPayments={commitmentPayments}
      profile={profile}
    />
  </div>
)
