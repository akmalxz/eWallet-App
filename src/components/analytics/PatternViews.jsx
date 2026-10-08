// src/components/analytics/PatternViews.jsx
import { useState, useMemo } from 'react'
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import {
  toMYDate, myWeekdayIndex, WEEKDAY_LABELS, daysInMonth,
  startOfWeekMY
} from '../../utils/dateHelpers'
import { useChartTheme } from '../../hooks/useChartTheme'
import { EmptyState, TransactionDrilldown } from './AnalyticsShared'

const compactValue = (n) => {
  const abs = Math.abs(n)
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}k`
  if (abs >= 100) return n.toFixed(0)
  return n.toFixed(2)
}

const weekdayFromShifted = (shiftedDate) => {
  const js = shiftedDate.getUTCDay()
  return js === 0 ? 6 : js - 1
}

// ============================================================
// Day-of-week bars — current week + period average (ghost)
// ============================================================
const DayOfWeekBars = ({ expenses, accounts }) => {
  const theme = useChartTheme()
  const [selectedDay, setSelectedDay] = useState(null)

  const data = useMemo(() => {
    if (expenses.length === 0) return null

    const weekStart = startOfWeekMY(new Date())
    const weekEndMs = weekStart.getTime() + 7 * 24 * 60 * 60 * 1000

    const dayOccurrences = [0, 0, 0, 0, 0, 0, 0]
    const shiftedMs = expenses.map((tx) => toMYDate(tx.transaction_date).getTime())
    const minMs = Math.min(...shiftedMs)
    const maxMs = Math.max(...shiftedMs)

    const minDate = new Date(minMs)
    const maxDate = new Date(maxMs)
    const startDay = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), minDate.getUTCDate()))
    const endDay = new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), maxDate.getUTCDate()))

    const cursor = new Date(startDay)
    while (cursor.getTime() <= endDay.getTime()) {
      dayOccurrences[weekdayFromShifted(cursor)]++
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    const periodTotals = [0, 0, 0, 0, 0, 0, 0]
    const periodCounts = [0, 0, 0, 0, 0, 0, 0]
    const thisWeekTotals = [0, 0, 0, 0, 0, 0, 0]
    const thisWeekCounts = [0, 0, 0, 0, 0, 0, 0]
    const thisWeekTxns = Array.from({ length: 7 }, () => [])
    const periodCategoryByDay = Array.from({ length: 7 }, () => ({}))

    expenses.forEach((tx) => {
      const idx = myWeekdayIndex(tx.transaction_date)
      const amt = Number(tx.amount) || 0
      periodTotals[idx] += amt
      periodCounts[idx] += 1

      const cat = (tx.category || 'Uncategorized').split(' > ')[0]
      periodCategoryByDay[idx][cat] = (periodCategoryByDay[idx][cat] || 0) + amt

      const txMs = toMYDate(tx.transaction_date).getTime()
      if (txMs >= weekStart.getTime() && txMs < weekEndMs) {
        thisWeekTotals[idx] += amt
        thisWeekCounts[idx] += 1
        thisWeekTxns[idx].push(tx)
      }
    })

    const periodAverages = periodTotals.map((t, i) =>
      dayOccurrences[i] > 0 ? t / dayOccurrences[i] : 0
    )
    const peakIdx = periodAverages.indexOf(Math.max(...periodAverages))

    const maxValue = Math.max(
      ...periodAverages,
      ...thisWeekTotals,
      1
    )

    return {
      periodAverages,
      periodCounts,
      periodTotals,
      thisWeekTotals,
      thisWeekCounts,
      thisWeekTxns,
      periodCategoryByDay,
      peakIdx,
      maxValue,
    }
  }, [expenses])

  if (!data) {
    return <EmptyState icon={BarChart3} title="No data yet" />
  }

  const topCategory = selectedDay != null
    ? Object.entries(data.periodCategoryByDay[selectedDay]).sort((a, b) => b[1] - a[1])[0]
    : null

  const todayWeekday = myWeekdayIndex(new Date())

  return (
    <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 md:p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-fg">Spending by Day of Week</h3>
          <p className="text-xs text-fg-muted mt-0.5">
            Solid bars are this week. Ghost bars are your average.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-brand" />
            <span className="text-[10px] font-bold text-fg-muted">This week</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-brand/25" />
            <span className="text-[10px] font-bold text-fg-muted">Avg</span>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-1.5 h-40">
        {data.periodAverages.map((avg, i) => {
          const weekVal = data.thisWeekTotals[i]
          const weekCount = data.thisWeekCounts[i]
          const periodCount = data.periodCounts[i]
          const ghostPct = data.maxValue > 0 ? (avg / data.maxValue) * 100 : 0
          const primaryPct = data.maxValue > 0 ? (weekVal / data.maxValue) * 100 : 0
          const isPeak = i === data.peakIdx && avg > 0
          const isSelected = selectedDay === i
          const isToday = todayWeekday === i

          const tooltipAlign =
            i === 0
              ? 'left-0'
              : i === data.periodAverages.length - 1
                ? 'right-0'
                : 'left-1/2 -translate-x-1/2'

          return (
            <button
              key={i}
              onClick={() => setSelectedDay((prev) => (prev === i ? null : i))}
              className="relative flex-1 h-full flex flex-col items-center gap-1.5 group"
              aria-label={`${WEEKDAY_LABELS[i]}, ${formatMYR(weekVal)} this week, ${formatMYR(avg)} on average`}
              aria-pressed={isSelected}
            >
              {/* HOVER TOOLTIP */}
              <div
                className={`absolute bottom-full mb-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-surface border border-line rounded-xl shadow-xl px-3 py-2 whitespace-nowrap ${tooltipAlign}`}
                role="tooltip"
              >
                <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5">
                  {WEEKDAY_LABELS[i]}
                </p>

                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                    <span className="w-2 h-2 rounded-sm bg-brand shrink-0" />
                    This week
                  </span>
                  <span className="text-[11px] font-bold text-fg tabular-nums">
                    {weekVal > 0 ? formatMYR(weekVal) : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 mt-1">
                  <span className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                    <span className="w-2 h-2 rounded-sm bg-brand/25 shrink-0" />
                    Average
                  </span>
                  <span className="text-[11px] font-bold text-fg tabular-nums">
                    {avg > 0 ? formatMYR(avg) : '—'}
                  </span>
                </div>

                {weekVal > 0 && avg > 0 && (
                  <p className="text-[10px] text-fg-subtle mt-1.5 pt-1.5 border-t border-line tabular-nums">
                    {weekVal > avg
                      ? `${(((weekVal - avg) / avg) * 100).toFixed(0)}% above usual`
                      : weekVal < avg
                        ? `${(((avg - weekVal) / avg) * 100).toFixed(0)}% below usual`
                        : 'On par with usual'}
                  </p>
                )}

                {weekCount > 0 && (
                  <p className="text-[10px] text-fg-subtle mt-0.5 tabular-nums">
                    {weekCount} {weekCount === 1 ? 'txn' : 'txns'} this week
                  </p>
                )}

                {periodCount > 0 && (
                  <p className="text-[10px] text-fg-subtle tabular-nums">
                    {periodCount} {periodCount === 1 ? 'txn' : 'txns'} in period
                  </p>
                )}
              </div>

              {/* COMPACT LABEL */}
              <span className="text-[9px] font-bold text-fg-subtle shrink-0 tabular-nums">
                {weekVal > 0 ? compactValue(weekVal) : ''}
              </span>

              {/* BARS */}
              <div className="flex-1 w-full relative">
                {avg > 0 && (
                  <div
                    className={`absolute inset-x-0 bottom-0 rounded-t-lg ${
                      isPeak ? 'bg-brand/25 dark:bg-brand/20' : 'bg-brand/15 dark:bg-brand/10'
                    }`}
                    style={{ height: `${Math.max(ghostPct, 3)}%` }}
                    aria-hidden="true"
                  />
                )}

                {weekVal > 0 && (
                  <div
                    className={`absolute inset-x-0 bottom-0 rounded-t-lg transition-all ${
                      isSelected ? 'ring-2 ring-inset ring-fg' : ''
                    }`}
                    style={{
                      height: `${Math.max(primaryPct, 4)}%`,
                      backgroundColor: isToday ? theme.accent : theme.current,
                      opacity: isSelected ? 1 : 0.92,
                    }}
                  />
                )}
              </div>

              {/* WEEKDAY LABEL */}
              <span
                className={`text-[10px] font-bold shrink-0 ${
                  isToday ? 'text-brand' : 'text-fg-muted'
                }`}
              >
                {WEEKDAY_LABELS[i]}
              </span>
            </button>
          )
        })}
      </div>

      {selectedDay != null && (
        <>
          <div className="mt-4 bg-surface-2 border border-line rounded-2xl p-4 animate-fadeIn">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
                  {WEEKDAY_LABELS[selectedDay]}s
                </p>

                <div className="flex items-baseline gap-2 mt-1.5">
                  <p className="text-lg font-black text-fg">
                    {formatMYR(data.thisWeekTotals[selectedDay])}
                  </p>
                  <span className="text-[11px] font-semibold text-fg-muted">this week</span>
                </div>

                <p className="text-xs text-fg-muted mt-1">
                  Typically{' '}
                  <strong className="text-fg">
                    {formatMYR(data.periodAverages[selectedDay])}
                  </strong>
                  {' · '}
                  {data.periodCounts[selectedDay]}{' '}
                  {data.periodCounts[selectedDay] === 1 ? 'txn' : 'txns'} in period
                </p>

                {topCategory && (
                  <p className="text-xs text-fg-muted mt-1">
                    Top category: <strong>{topCategory[0]}</strong> ({formatMYR(topCategory[1])})
                  </p>
                )}
              </div>

              <button
                onClick={() => setSelectedDay(null)}
                className="text-xs font-bold text-fg-subtle hover:text-fg px-3 py-2 rounded-lg hover:bg-surface transition-colors shrink-0"
                style={{ minHeight: 44 }}
              >
                Close
              </button>
            </div>
          </div>

          {data.thisWeekTxns[selectedDay].length > 0 && (
            <TransactionDrilldown
              title={`${WEEKDAY_LABELS[selectedDay]} · this week`}
              total={data.thisWeekTotals[selectedDay]}
              transactions={data.thisWeekTxns[selectedDay]}
              accounts={accounts}
              sortBy="date"
              scrollable
              onClose={() => setSelectedDay(null)}
            />
          )}
        </>
      )}
    </div>
  )
}

// ============================================================
// Calendar heatmap
// ============================================================
const CalendarHeatmap = ({ expenses, accounts }) => {
  const theme = useChartTheme()
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDayKey, setSelectedDayKey] = useState(null)

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
      if (amt === 0) return 0
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
        total: totalsByDay[d] || 0,
        level: level(totalsByDay[d] || 0),
        txns: txByDay[d] || []
      })
    }

    const monthName = firstDay.toLocaleString('en-MY', {
      month: 'long', year: 'numeric', timeZone: 'UTC'
    })

    return { cells, monthName }
  }, [cursor, expenses])

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

  return (
    <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-fg">Daily Spending Calendar</h3>
          <p className="text-xs text-fg-muted mt-0.5">{monthData.monthName}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => go(-1)}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => go(1)}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((d) => (
          <span
            key={d}
            className="text-[9px] font-bold text-fg-subtle text-center uppercase tracking-wider"
          >
            {d.slice(0, 1)}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthData.cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />
          const isSelected = selectedDayKey === cell.day
          const isFuture =
            isFutureMonth || (isCurrentMonth && cell.day > todayMY.getUTCDate())
          return (
            <button
              key={cell.day}
              onClick={() =>
                !isFuture && setSelectedDayKey((prev) => (prev === cell.day ? null : cell.day))
              }
              disabled={isFuture}
              aria-label={`Day ${cell.day}, ${formatMYR(cell.total)}`}
              aria-pressed={isSelected}
              className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                isSelected ? 'ring-2 ring-inset ring-fg' : ''
              } ${isFuture ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}`}
              style={{
                backgroundColor: theme.heatmap[cell.level],
                color: cell.level >= 3 ? theme.heatTextStrong : theme.heatTextLight
              }}
            >
              {cell.day}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[9px] text-fg-subtle font-semibold">Less</span>
        {theme.heatmap.map((c, i) => (
          <div key={i} className="w-3 h-3 rounded" style={{ backgroundColor: c }} />
        ))}
        <span className="text-[9px] text-fg-subtle font-semibold">More</span>
      </div>

      {selectedCell && selectedCell.txns.length > 0 && (
        <TransactionDrilldown
          title={`Day ${selectedCell.day}`}
          total={selectedCell.total}
          transactions={selectedCell.txns}
          accounts={accounts}
          sortBy="date"
          scrollable
          onClose={() => setSelectedDayKey(null)}
        />
      )}
    </div>
  )
}

// ============================================================
// PatternViews — exported
// ============================================================
export const PatternViews = ({ expenses, accounts }) => (
  <div className="space-y-4">
    <DayOfWeekBars expenses={expenses} accounts={accounts} />
    <CalendarHeatmap expenses={expenses} accounts={accounts} />
  </div>
)