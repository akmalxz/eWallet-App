// src/components/analytics/HeadlineInsights.jsx
import { useMemo } from 'react'
import {
  TrendingUp, TrendingDown, Calendar, Sparkles
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import {
  toMYDate, myWeekdayIndex, WEEKDAY_LABELS, getPayCycle
} from '../../utils/dateHelpers'
import { useChartTheme } from '../../hooks/useChartTheme'
import { EmptyState } from './AnalyticsShared'

const MIN_DAYS = 14
const MIN_TX = 15
const MIN_PCT = 15

export const HeadlineInsights = ({ expenses, periodMonths, onNavigate, profile }) => {
  const theme = useChartTheme()

  const insights = useMemo(() => {
    if (!expenses.length) return []

    const now = new Date()
    // 1. Get current and previous cycle dates
    const { startDate: thisCycleStart } = getPayCycle(now, profile?.payday_type, profile?.payday_date)
    const prevCycleEndSeed = new Date(thisCycleStart.getTime() - 86400000)
    const { startDate: prevCycleStart, endDate: prevCycleEnd } = getPayCycle(prevCycleEndSeed, profile?.payday_type, profile?.payday_date)

    const periodExpenses = expenses.filter(
      tx => toMYDate(tx.transaction_date) >= thisCycleStart
    )

    const dayCount = new Set()
    periodExpenses.forEach(tx => dayCount.add(toMYDate(tx.transaction_date).getTime()))

    if (dayCount.size < MIN_DAYS || periodExpenses.length < MIN_TX) return []

    // 2. Weekday Math
    const totalsByWeekday = [0, 0, 0, 0, 0, 0, 0]
    const occurrencesByWeekday = [0, 0, 0, 0, 0, 0, 0]

    const start = new Date(thisCycleStart)
    while (start <= now) {
      occurrencesByWeekday[myWeekdayIndex(start)]++
      start.setDate(start.getDate() + 1)
    }

    periodExpenses.forEach(tx => {
      const idx = myWeekdayIndex(tx.transaction_date)
      totalsByWeekday[idx] += Number(tx.amount) || 0
    })

    const avgByWeekday = totalsByWeekday.map((t, i) =>
      occurrencesByWeekday[i] > 0 ? t / occurrencesByWeekday[i] : 0
    )
    const peakIdx = avgByWeekday.indexOf(Math.max(...avgByWeekday))
    const peakAvg = avgByWeekday[peakIdx]

    const weekendDays = occurrencesByWeekday[5] + occurrencesByWeekday[6]
    const weekendTotal = totalsByWeekday[5] + totalsByWeekday[6]
    const weekendAvg = weekendDays > 0 ? weekendTotal / weekendDays : 0

    const weekdayDays = occurrencesByWeekday.slice(0, 5).reduce((a, b) => a + b, 0)
    const weekdayTotal = totalsByWeekday.slice(0, 5).reduce((a, b) => a + b, 0)
    const weekdayAvg = weekdayDays > 0 ? weekdayTotal / weekdayDays : 0

    const weekendGap = weekdayAvg > 0
      ? ((weekendAvg - weekdayAvg) / weekdayAvg) * 100
      : 0

    // 3. Category Spike Math (Current Cycle vs Previous Cycle)
    const mainCat = (cat) => (cat || 'Uncategorized').split(' > ')[0]
    const thisCatTotals = {}
    const prevCatTotals = {}

    expenses.forEach(tx => {
      const d = toMYDate(tx.transaction_date)
      const c = mainCat(tx.category)
      const amt = Number(tx.amount) || 0

      if (d >= thisCycleStart) {
        thisCatTotals[c] = (thisCatTotals[c] || 0) + amt
      } else if (d >= prevCycleStart && d <= prevCycleEnd) {
        prevCatTotals[c] = (prevCatTotals[c] || 0) + amt
      }
    })

    let biggestIncrease = null
    Object.keys(thisCatTotals).forEach(c => {
      const diff = (thisCatTotals[c] || 0) - (prevCatTotals[c] || 0)
      if (diff > 0 && (!biggestIncrease || diff > biggestIncrease.diff)) {
        biggestIncrease = { category: c, diff, thisTotal: thisCatTotals[c], lastTotal: prevCatTotals[c] || 0 }
      }
    })

    // 4. Cycle-to-Date Math (Comparison vs same days last cycle)
    const daysPassed = Math.max(1, Math.round((now - thisCycleStart) / 86400000))
    const prevCycleSamePeriodEnd = new Date(prevCycleStart.getTime() + daysPassed * 86400000)

    const ctd = expenses
      .filter(tx => toMYDate(tx.transaction_date) >= thisCycleStart)
      .reduce((s, tx) => s + Number(tx.amount), 0)

    const lastCTD = expenses
      .filter(tx => {
        const d = toMYDate(tx.transaction_date)
        return d >= prevCycleStart && d <= prevCycleSamePeriodEnd
      })
      .reduce((s, tx) => s + Number(tx.amount), 0)

    const ctdPct = lastCTD > 0 ? ((ctd - lastCTD) / lastCTD) * 100 : null

    // 5. Build Cards
    const cards = []

    if (peakAvg > 0) {
      cards.push({
        id: 'peak_weekday',
        icon: Calendar,
        sentence: (
          <>You spend the most on <strong>{WEEKDAY_LABELS[peakIdx]}s</strong>, about <strong className="tabular-figures">{formatMYR(peakAvg)}</strong> on average.</>
        ),
        score: peakAvg,
        tone: 'neutral',
        navigateTo: 'trends'
      })
    }

    if (weekendGap >= MIN_PCT && weekendAvg > 0) {
      cards.push({
        id: 'weekend_gap',
        icon: TrendingUp,
        sentence: (
          <>Weekend spend is <strong>{weekendGap.toFixed(0)}%</strong> higher than weekdays.</>
        ),
        score: Math.abs(weekendGap) * 10,
        tone: 'up',
        navigateTo: 'trends'
      })
    } else if (weekendGap <= -MIN_PCT) {
      cards.push({
        id: 'weekend_gap',
        icon: TrendingDown,
        sentence: (
          <>Weekend spend is <strong>{Math.abs(weekendGap).toFixed(0)}%</strong> lower than weekdays.</>
        ),
        score: Math.abs(weekendGap) * 10,
        tone: 'down',
        navigateTo: 'trends'
      })
    }

    if (biggestIncrease && biggestIncrease.diff > 0) {
      cards.push({
        id: 'cat_increase',
        icon: TrendingUp,
        sentence: (
          <><strong>{biggestIncrease.category}</strong> went up <strong className="tabular-figures">{formatMYR(biggestIncrease.diff)}</strong> vs last cycle.</>
        ),
        score: biggestIncrease.diff,
        tone: 'up',
        navigateTo: 'categories'
      })
    }

    if (ctdPct !== null && Math.abs(ctdPct) >= MIN_PCT) {
      cards.push({
        id: 'ctd_pace',
        icon: ctdPct > 0 ? TrendingUp : TrendingDown,
        sentence: (
          <>Cycle-to-date spending is <strong>{ctdPct > 0 ? 'up' : 'down'} {Math.abs(ctdPct).toFixed(0)}%</strong> vs the same days last cycle.</>
        ),
        score: Math.abs(ctdPct) * 5,
        tone: ctdPct > 0 ? 'up' : 'down',
        navigateTo: 'categories'
      })
    }

    return cards.sort((a, b) => b.score - a.score).slice(0, 4)
  }, [expenses, periodMonths, profile?.payday_type, profile?.payday_date])

  if (insights.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Keep logging to unlock insights"
        message="We need about 14 days of data or 15 transactions before we can spot patterns."
      />
    )
  }

  const toneStyles = {
    up:      { color: theme.up,      bg: 'bg-danger-soft' },
    down:    { color: theme.down,    bg: 'bg-success-soft' },
    neutral: { color: theme.neutral, bg: 'bg-surface-2' }
  }

  return (
    <div className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
      {insights.map(card => {
        const Icon = card.icon
        const tone = toneStyles[card.tone] || toneStyles.neutral
        return (
          <button
            key={card.id}
            onClick={() => card.navigateTo && onNavigate?.(card.navigateTo)}
            className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-surface-2 transition-colors group"
          >
            <div
              className={`w-9 h-9 ${tone.bg} rounded-xl flex items-center justify-center shrink-0`}
              style={{ color: tone.color }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-sm text-fg-muted leading-relaxed flex-1 pt-1">
              {card.sentence}
            </p>
          </button>
        )
      })}
    </div>
  )
}