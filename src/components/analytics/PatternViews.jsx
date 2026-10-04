// src/components/analytics/PatternViews.jsx
import { useState, useMemo } from 'react'
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import {
  toMYDate, myWeekdayIndex, WEEKDAY_LABELS, daysInMonth
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
// Day-of-week bars
// ============================================================
const DayOfWeekBars = ({ expenses }) => {
  const theme = useChartTheme()
  const [selectedDay, setSelectedDay] = useState(null)

  const data = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0, 0, 0]
    const dayOccurrences = [0, 0, 0, 0, 0, 0, 0]

    if (expenses.length === 0) return null

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

    const transactionsByDay = Array.from({ length: 7 }, () => [])
    const categoryByDay = Array.from({ length: 7 }, () => ({}))

    expenses.forEach((tx) => {
      const idx = myWeekdayIndex(tx.transaction_date)
      const amt = Number(tx.amount) || 0
      totals[idx] += amt
      counts[idx] += 1
      transactionsByDay[idx].push(tx)
      const cat = (tx.category || 'Uncategorized').split(' > ')[0]
      categoryByDay[idx][cat] = (categoryByDay[idx][cat] || 0) + amt
    })

    const averages = totals.map((t, i) => dayOccurrences[i] > 0 ? t / dayOccurrences[i] : 0)
    const peakIdx = averages.indexOf(Math.max(...averages))

    return { averages, counts, transactionsByDay, categoryByDay, peakIdx }
  }, [expenses])

  if (!data) {
    return <EmptyState icon={BarChart3} title="No data yet" />
  }

  const maxAvg = Math.max(...data.averages, 1)
  const topCategory = selectedDay != null
    ? Object.entries(data.categoryByDay[selectedDay]).sort((a, b) => b[1] - a[1])[0]
    : null

  return (
    <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 md:p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-fg">Spending by Day of Week</h3>
        <p className="text-xs text-fg-muted mt-0.5">
          You spend the most on <strong>{WEEKDAY_LABELS[data.peakIdx]}s</strong>, about{' '}
          <strong>{formatMYR(data.averages[data.peakIdx])}</strong> on average.
        </p>
      </div>

      <div className="flex items-end justify-between gap-1.5 h-40">
        {data.averages.map((avg, i) => {
          const pct = maxAvg > 0 ? (avg / maxAvg) * 100 : 0
          const isEmpty = avg === 0
          const isPeak = i === data.peakIdx && !isEmpty
          const isSelected = selectedDay === i

          const barColor = isEmpty
            ? theme.zero
            : isPeak
              ? theme.accent
              : theme.current

          const heightPct = isEmpty ? 3 : Math.max(pct, 6)

          return (
            <button
              key={i}
              onClick={() => setSelectedDay((prev) => (prev === i ? null : i))}
              className="flex-1 h-full flex flex-col items-center gap-1.5 group"
              aria-label={`${WEEKDAY_LABELS[i]}, average ${formatMYR(avg)}`}
              aria-pressed={isSelected}
            >
              <span className="text-[9px] font-bold text-fg-subtle shrink-0">
                {isEmpty ? '' : compactValue(avg)}
              </span>

              <div className="flex-1 w-full flex items-end">
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    isSelected ? 'ring-2 ring-line-strong' : ''
                  }`}
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: barColor,
                    opacity: isSelected ? 1 : 0.85
                  }}
                />
              </div>

              <span className="text-[10px] font-bold text-fg-muted shrink-0">
                {WEEKDAY_LABELS[i]}
              </span>
            </button>
          )
        })}
      </div>

      {selectedDay != null && (
        <div className="mt-4 bg-surface-2 border border-line rounded-2xl p-4 animate-fadeIn">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
                {WEEKDAY_LABELS[selectedDay]}s
              </p>
              <p className="text-base font-black text-fg mt-0.5">
                {formatMYR(data.averages[selectedDay])} avg ·{' '}
                {data.counts[selectedDay]} txns total
              </p>
              {topCategory && (
                <p className="text-xs text-fg-muted mt-1">
                  Top category: <strong>{topCategory[0]}</strong> ({formatMYR(topCategory[1])})
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs font-bold text-fg-subtle hover:text-fg px-3 py-2 rounded-lg hover:bg-surface transition-colors"
              style={{ minHeight: 44 }}
              aria-label="Close day details"
            >
              Close
            </button>
          </div>
        </div>
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
          const isFuture = (() => {
            const t = new Date()
            return (
              cursor.getFullYear() > t.getFullYear() ||
              (cursor.getFullYear() === t.getFullYear() &&
                (cursor.getMonth() > t.getMonth() ||
                  (cursor.getMonth() === t.getMonth() && cell.day > t.getDate())))
            )
          })()
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
                isSelected ? 'ring-2 ring-fg ring-offset-1 ring-offset-surface' : ''
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
          onClose={() => setSelectedDayKey(null)}
        />
      )}
    </div>
  )
}

export const PatternViews = ({ expenses, accounts }) => (
  <div className="space-y-4">
    <DayOfWeekBars expenses={expenses} accounts={accounts} />
    <CalendarHeatmap expenses={expenses} accounts={accounts} />
  </div>
)