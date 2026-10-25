// src/components/analytics/PatternViews.jsx
import { useState, useMemo, useRef, useEffect } from 'react'
import { 
  BarChart3, ChevronLeft, ChevronRight, Flame, Zap, Award, 
  CalendarCheck, MinusCircle, Snowflake, Lock
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import {
  toMYDate, myWeekdayIndex, WEEKDAY_LABELS, daysInMonth,
  startOfWeekMY, dayKey
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
// 1. Day-of-week bars
// ============================================================
const DayOfWeekBars = ({ expenses, accounts }) => {
  const theme = useChartTheme()
  const [selectedDay, setSelectedDay] = useState(null)
  const drilldownRef = useRef(null)

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

    const maxValue = Math.max(...periodAverages, ...thisWeekTotals, 1)

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

  // Auto-scroll to drilldown when a day is selected
  useEffect(() => {
    if (selectedDay !== null && drilldownRef.current) {
      setTimeout(() => {
        drilldownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    }
  }, [selectedDay])

  if (!data) return <EmptyState icon={BarChart3} title="No data yet" />

  const topCategory = selectedDay != null
    ? Object.entries(data.periodCategoryByDay[selectedDay]).sort((a, b) => b[1] - a[1])[0]
    : null

  const todayWeekday = myWeekdayIndex(new Date())

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
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
            i === 0 ? 'left-0' : i === data.periodAverages.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'

          return (
            <button
              key={i}
              onClick={() => setSelectedDay((prev) => (prev === i ? null : i))}
              className="relative flex-1 h-full flex flex-col items-center gap-1.5 group"
              aria-label={`${WEEKDAY_LABELS[i]}, ${formatMYR(weekVal)} this week, ${formatMYR(avg)} on average`}
              aria-pressed={isSelected}
            >
              <div className={`absolute bottom-full mb-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-surface border border-line rounded-xl shadow-xl px-3 py-2 whitespace-nowrap ${tooltipAlign}`} role="tooltip">
                <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5">{WEEKDAY_LABELS[i]}</p>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-[11px] text-fg-muted"><span className="w-2 h-2 rounded-sm bg-brand shrink-0" /> This week</span>
                  <span className="text-[11px] font-bold text-fg tabular-figures">{weekVal > 0 ? formatMYR(weekVal) : '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-4 mt-1">
                  <span className="flex items-center gap-1.5 text-[11px] text-fg-muted"><span className="w-2 h-2 rounded-sm bg-brand/25 shrink-0" /> Average</span>
                  <span className="text-[11px] font-bold text-fg tabular-figures">{avg > 0 ? formatMYR(avg) : '—'}</span>
                </div>
                {weekCount > 0 && <p className="text-[10px] text-fg-subtle mt-0.5 tabular-figures">{weekCount} {weekCount === 1 ? 'txn' : 'txns'} this week</p>}
                {periodCount > 0 && <p className="text-[10px] text-fg-subtle mt-0.5 tabular-figures">{periodCount} {periodCount === 1 ? 'txn' : 'txns'} in period</p>}
              </div>

              <span className="text-[9px] font-bold text-fg-subtle shrink-0 tabular-figures">{weekVal > 0 ? compactValue(weekVal) : ''}</span>

              <div className="flex-1 w-full relative">
                {avg > 0 && <div className={`absolute inset-x-0 bottom-0 rounded-t-lg ${isPeak ? 'bg-brand/25 dark:bg-brand/20' : 'bg-brand/15 dark:bg-brand/10'}`} style={{ height: `${Math.max(ghostPct, 3)}%` }} aria-hidden="true" />}
                {weekVal > 0 && (
                  <div className={`absolute inset-x-0 bottom-0 rounded-t-lg transition-all ${isSelected ? 'ring-2 ring-inset ring-fg' : ''}`} style={{ height: `${Math.max(primaryPct, 4)}%`, backgroundColor: isToday ? theme.accent : theme.current, opacity: isSelected ? 1 : 0.92 }} />
                )}
              </div>

              <span className={`text-[10px] font-bold shrink-0 ${isToday ? 'text-brand' : 'text-fg-muted'}`}>{WEEKDAY_LABELS[i]}</span>
            </button>
          )
        })}
      </div>

      {selectedDay != null && (
        <>
          <div className="mt-4 pt-4 border-t border-line animate-fadeIn">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">{WEEKDAY_LABELS[selectedDay]}s</p>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <p className="text-lg font-black text-fg tabular-figures">{formatMYR(data.thisWeekTotals[selectedDay])}</p>
                  <span className="text-[11px] font-semibold text-fg-muted">this week</span>
                </div>
                <p className="text-xs text-fg-muted mt-1">Typically <strong className="text-fg tabular-figures">{formatMYR(data.periodAverages[selectedDay])}</strong></p>
                {topCategory && <p className="text-xs text-fg-muted mt-1">Top: <strong>{topCategory[0]}</strong> ({formatMYR(topCategory[1])})</p>}
              </div>
              <button onClick={() => setSelectedDay(null)} className="text-xs font-bold text-fg-subtle hover:text-fg px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors shrink-0" style={{ minHeight: 44 }}>Close</button>
            </div>
          </div>
          {data.thisWeekTxns[selectedDay].length > 0 && (
            <div ref={drilldownRef} className="scroll-mt-24">
              <TransactionDrilldown title={`${WEEKDAY_LABELS[selectedDay]} · this week`} total={data.thisWeekTotals[selectedDay]} transactions={data.thisWeekTxns[selectedDay]} accounts={accounts} sortBy="date" scrollable onClose={() => setSelectedDay(null)} />
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ============================================================
// 2. Interactive Calendar Heatmap with Integrated Streaks
// ============================================================
const CalendarHeatmap = ({ expenses, accounts }) => {
  const theme = useChartTheme()
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDayKey, setSelectedDayKey] = useState(null)
  const drilldownRef = useRef(null)

  // Calculate Streak Stats
  const streakStats = useMemo(() => {
    if (!expenses || expenses.length === 0) return null

    const dailyTotals = new Map()
    expenses.forEach(tx => {
      const k = dayKey(tx.transaction_date)
      dailyTotals.set(k, (dailyTotals.get(k) || 0) + (Number(tx.amount) || 0))
    })

    const allTotals = [...dailyTotals.values()].sort((a, b) => a - b)
    if (allTotals.length === 0) return null

    const mid = Math.floor(allTotals.length / 2)
    const median = allTotals.length % 2 !== 0 ? allTotals[mid] : (allTotals[mid - 1] + allTotals[mid]) / 2
    const threshold = Math.max(10, median * 0.5)

    const today = dayKey(new Date())
    const sortedKeys = [...dailyTotals.keys()].sort()
    const firstKey = sortedKeys[0]
    
    const start = new Date(firstKey + 'T00:00:00Z')
    const end = new Date(today + 'T00:00:00Z')
    const daysDiff = Math.round((end.getTime() - start.getTime()) / 86400000)
    
    if (daysDiff < 7) {
      return { locked: true, daysLeft: 7 - daysDiff }
    }

    let freeDays = 0, bestStreak = 0, currentRun = 0
    let graceUsed = false
    const statusMap = new Map()
    
    const cursor = new Date(start)
    
    while (cursor <= end) {
      const k = cursor.toISOString().slice(0, 10)
      const spent = dailyTotals.get(k)
      
      const isToday = k === today
      const isPending = isToday && spent === undefined
      const isMissing = spent === undefined && !isPending
      const isLowSpend = !isPending && !isMissing && spent < threshold
      
      let isGrace = false

      if (isLowSpend) {
        freeDays++
        currentRun++
        graceUsed = false
        bestStreak = Math.max(bestStreak, currentRun)
        statusMap.set(k, 'low')
      } else if (!isPending) {
        if (!graceUsed) {
          graceUsed = true
          isGrace = true
          statusMap.set(k, 'grace')
        } else {
          currentRun = 0
          graceUsed = false
          statusMap.set(k, isMissing ? 'missing' : 'over')
        }
      } else {
        statusMap.set(k, 'pending')
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    return { locked: false, freeDays, currentStreak: currentRun, bestStreak, threshold, statusMap }
  }, [expenses])

  // Auto-scroll to drilldown when a day is selected
  useEffect(() => {
    if (selectedDayKey !== null && drilldownRef.current) {
      setTimeout(() => {
        drilldownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    }
  }, [selectedDayKey])

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
        key: dayKey(new Date(Date.UTC(year, monthIdx, d))),
        total: totalsByDay[d] || 0,
        level: level(totalsByDay[d] || 0),
        txns: txByDay[d] || []
      })
    }

    const monthName = firstDay.toLocaleString('en-MY', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    return { cells, monthName }
  }, [cursor, expenses])

  const selectedCell = monthData.cells.find((c) => c && c.day === selectedDayKey)

  const todayMY = toMYDate(new Date())
  const cursorMY = toMYDate(cursor)
  const isFutureMonth = cursorMY.getUTCFullYear() > todayMY.getUTCFullYear() || (cursorMY.getUTCFullYear() === todayMY.getUTCFullYear() && cursorMY.getUTCMonth() > todayMY.getUTCMonth())
  const isCurrentMonth = cursorMY.getUTCFullYear() === todayMY.getUTCFullYear() && cursorMY.getUTCMonth() === todayMY.getUTCMonth()

  const go = (delta) => {
    setCursor((c) => {
      const n = new Date(c)
      n.setDate(1)
      n.setMonth(n.getMonth() + delta)
      return n
    })
    setSelectedDayKey(null)
  }

  if (!streakStats) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-fg flex items-center gap-2">
            <Flame className={`w-4 h-4 ${streakStats.currentStreak > 0 ? 'text-warning' : 'text-fg-subtle'}`} />
            Daily Spending Calendar
          </h3>
          <p className="text-xs text-fg-muted mt-0.5">{monthData.monthName}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => go(-1)} className="w-11 h-11 flex items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => go(1)} className="w-11 h-11 flex items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors" aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {streakStats.locked ? (
        <div className="text-center p-4 bg-surface-2/50 border border-dashed border-line-strong rounded-xl">
          <Lock className="w-5 h-5 mx-auto text-fg-subtle mb-2" />
          <p className="text-xs text-fg-muted font-bold">
            Streaks locked. Log for {streakStats.daysLeft} more day{streakStats.daysLeft === 1 ? '' : 's'} to unlock.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-fg-muted">
            Low-spend goal: under <strong>{formatMYR(streakStats.threshold)}</strong> per day.
          </p>
          
          <div className="grid grid-cols-3 divide-x divide-line border-y border-line py-3 mb-2">
            <div className="text-center px-1">
              <p className="text-[9px] md:text-[10px] font-bold text-fg-subtle uppercase tracking-wider flex items-center justify-center gap-1">
                <CalendarCheck className="w-3 h-3 md:w-3.5 md:h-3.5" /> Low Days
              </p>
              <p className="text-lg md:text-xl font-black text-fg mt-0.5 tabular-figures">{streakStats.freeDays}</p>
            </div>
            
            <div className="text-center px-1">
              <p className="text-[9px] md:text-[10px] font-bold text-fg-subtle uppercase tracking-wider flex items-center justify-center gap-1">
                {streakStats.currentStreak > 0 ? <Zap className="w-3 h-3 md:w-3.5 md:h-3.5 text-warning" /> : <MinusCircle className="w-3 h-3 md:w-3.5 md:h-3.5" />} Current
              </p>
              <p className={`text-lg md:text-xl font-black mt-0.5 tabular-figures ${streakStats.currentStreak > 0 ? 'text-warning' : 'text-fg'}`}>{streakStats.currentStreak}</p>
            </div>

            <div className="text-center px-1">
              <p className="text-[9px] md:text-[10px] font-bold text-fg-subtle uppercase tracking-wider flex items-center justify-center gap-1">
                <Award className="w-3 h-3 md:w-3.5 md:h-3.5 text-success" /> Best Run
              </p>
              <p className="text-lg md:text-xl font-black text-fg mt-0.5 tabular-figures">{streakStats.bestStreak}</p>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-1">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d} className="text-[9px] md:text-[11px] font-bold text-fg-subtle text-center uppercase tracking-wider">{d.slice(0, 1)}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {monthData.cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />
          const isSelected = selectedDayKey === cell.day
          const isFuture = isFutureMonth || (isCurrentMonth && cell.day > todayMY.getUTCDate())
          
          const status = streakStats.statusMap?.get(cell.key) || (isFuture ? null : 'missing')

          return (
            <button
              key={cell.day}
              onClick={() => !isFuture && setSelectedDayKey((prev) => (prev === cell.day ? null : cell.day))}
              disabled={isFuture}
              aria-label={`Day ${cell.day}, ${formatMYR(cell.total)}`}
              aria-pressed={isSelected}
              className={`relative aspect-square rounded-lg flex items-center justify-center text-[10px] md:text-sm font-bold transition-all ${
                isSelected ? 'ring-2 ring-inset ring-fg' : ''
              } ${isFuture ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}`}
              style={{
                backgroundColor: theme.heatmap[cell.level],
                color: cell.level >= 3 ? theme.heatTextStrong : theme.heatTextLight
              }}
            >
              {cell.day}

              {status === 'low' && <Flame className="w-2.5 h-2.5 md:w-4.5 md:h-4.5 absolute top-0.5 right-0.5 md:top-1 md:right-1 text-warning" strokeWidth={2} />}
              {status === 'grace' && <Snowflake className="w-2.5 h-2.5 md:w-4.5 md:h-4.5 absolute top-0.5 right-0.5 md:top-1 md:right-1 text-white drop-shadow-sm" strokeWidth={2} />}
              {status === 'over' && <MinusCircle className="w-2.5 h-2.5 md:w-4.5 md:h-4.5 absolute top-0.5 right-0.5 md:top-1 md:right-1 text-danger" strokeWidth={2} />}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] md:text-[10px] text-fg-subtle font-semibold">Less</span>
          {theme.heatmap.map((c, i) => <div key={i} className="w-2.5 h-2.5 md:w-3 md:h-3 rounded" style={{ backgroundColor: c }} />)}
          <span className="text-[9px] md:text-[10px] text-fg-subtle font-semibold">More</span>
        </div>

        <div className="flex items-center gap-2 md:gap-3 text-[9px] md:text-[10px] text-fg-subtle font-medium">
          <div className="flex items-center gap-1"><Flame className="w-3 h-3 md:w-3.5 md:h-3.5 text-warning" /> Low</div>
          <div className="flex items-center gap-1"><Snowflake className="w-3 h-3 md:w-3.5 md:h-3.5 text-white drop-shadow-sm" /> Grace</div>
          <div className="flex items-center gap-1"><MinusCircle className="w-3 h-3 md:w-3.5 md:h-3.5 text-danger" /> Over</div>
        </div>
      </div>

      {selectedCell && selectedCell.txns.length > 0 && (
        <div ref={drilldownRef} className="scroll-mt-24">
          <TransactionDrilldown
            title={`Day ${selectedCell.day}`}
            total={selectedCell.total}
            transactions={selectedCell.txns}
            accounts={accounts}
            sortBy="date"
            scrollable
            onClose={() => setSelectedDayKey(null)}
          />
        </div>
      )}
    </section>
  )
}

export const PatternViews = ({ expenses, accounts }) => (
  <div className="space-y-8">
    <CalendarHeatmap expenses={expenses} accounts={accounts} />
    <DayOfWeekBars expenses={expenses} accounts={accounts} />
  </div>
)