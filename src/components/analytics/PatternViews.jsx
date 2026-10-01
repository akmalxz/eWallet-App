// src/components/analytics/PatternViews.jsx
import { useState, useMemo } from 'react'
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import {
  toMYDate, myWeekdayIndex, WEEKDAY_LABELS, daysInMonth
} from '../../utils/dateHelpers'
import { COLORS, HEATMAP_LEVELS } from '../../utils/analyticsColors'
import { EmptyState, TransactionDrilldown } from './AnalyticsShared'

// ============================================================
// Day-of-week bars
// ============================================================
const DayOfWeekBars = ({ expenses }) => {
  const [selectedDay, setSelectedDay] = useState(null)

  const data = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0, 0, 0]
    const dayOccurrences = [0, 0, 0, 0, 0, 0, 0]

    if (expenses.length === 0) return null
    const dates = expenses.map((tx) => toMYDate(tx.transaction_date).getTime())
    const minD = new Date(Math.min(...dates))
    const maxD = new Date(Math.max(...dates))
    const cursor = new Date(minD)
    while (cursor <= maxD) {
      dayOccurrences[myWeekdayIndex(cursor)]++
      cursor.setDate(cursor.getDate() + 1)
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

    const averages = totals.map((t, i) =>
      dayOccurrences[i] > 0 ? t / dayOccurrences[i] : 0
    )
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
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-5 md:p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">Spending by Day of Week</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          You spend the most on <strong>{WEEKDAY_LABELS[data.peakIdx]}s</strong>, about{' '}
          <strong>{formatMYR(data.averages[data.peakIdx])}</strong> on average.
        </p>
      </div>

      <div className="flex items-end justify-between gap-1.5 h-40">
        {data.averages.map((avg, i) => {
          const h = maxAvg > 0 ? (avg / maxAvg) * 100 : 0
          const isPeak = i === data.peakIdx
          const isSelected = selectedDay === i
          return (
            <button
              key={i}
              onClick={() => setSelectedDay((prev) => (prev === i ? null : i))}
              className="flex-1 flex flex-col items-center gap-1.5 group"
              aria-label={`${WEEKDAY_LABELS[i]}, average ${formatMYR(avg)}`}
              aria-pressed={isSelected}
            >
              <span className="text-[9px] font-bold text-slate-400">
                {avg > 0 ? formatMYR(avg).replace('RM', '').trim() : ''}
              </span>
              <div
                className={`w-full rounded-t-lg transition-all ${
                  isSelected ? 'ring-2 ring-slate-400' : ''
                }`}
                style={{
                  height: `${Math.max(h, 3)}%`,
                  backgroundColor: isPeak ? COLORS.up : COLORS.current,
                  opacity: isSelected ? 1 : 0.85
                }}
              />
              <span className="text-[10px] font-bold text-slate-500">
                {WEEKDAY_LABELS[i]}
              </span>
            </button>
          )
        })}
      </div>

      {selectedDay != null && (
        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 animate-fadeIn">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {WEEKDAY_LABELS[selectedDay]}s
              </p>
              <p className="text-base font-black text-slate-800 mt-0.5">
                {formatMYR(data.averages[selectedDay])} avg · {data.counts[selectedDay]} txns
              </p>
              {topCategory && (
                <p className="text-xs text-slate-500 mt-1">
                  Top category: <strong>{topCategory[0]}</strong> ({formatMYR(topCategory[1])})
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-white transition-colors"
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
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDayKey, setSelectedDayKey] = useState(null)

  const monthData = useMemo(() => {
    const year = cursor.getFullYear()
    const monthIdx = cursor.getMonth()
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
      n.setMonth(n.getMonth() + delta)
      return n
    })
    setSelectedDayKey(null)
  }

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-5 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Daily Spending Calendar</h3>
          <p className="text-xs text-slate-500 mt-0.5">{monthData.monthName}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => go(-1)}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => go(1)}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
            className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wider"
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
              onClick={() => !isFuture && setSelectedDayKey((prev) => (prev === cell.day ? null : cell.day))}
              disabled={isFuture}
              aria-label={`Day ${cell.day}, ${formatMYR(cell.total)}`}
              aria-pressed={isSelected}
              className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                isSelected ? 'ring-2 ring-slate-800 ring-offset-1' : ''
              } ${isFuture ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}`}
              style={{
                backgroundColor: cell.level === 0 ? HEATMAP_LEVELS[0] : HEATMAP_LEVELS[cell.level],
                color: cell.level >= 3 ? '#fff' : '#475569'
              }}
            >
              {cell.day}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[9px] text-slate-400 font-semibold">Less</span>
        {HEATMAP_LEVELS.map((c, i) => (
          <div key={i} className="w-3 h-3 rounded" style={{ backgroundColor: c }} />
        ))}
        <span className="text-[9px] text-slate-400 font-semibold">More</span>
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