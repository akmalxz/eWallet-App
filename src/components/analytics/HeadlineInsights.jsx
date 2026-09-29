// src/components/analytics/HeadlineInsights.jsx
import { useMemo } from 'react'
import {
  TrendingUp, TrendingDown, Calendar, Minus, Sparkles
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import {
  toMYDate, myWeekdayIndex, WEEKDAY_LABELS, monthKey, dayKey
} from '../../utils/dateHelpers'
import { COLORS } from '../../utils/analyticsColors'
import { EmptyState } from './AnalyticsShared'

// Threshold for minimum data
const MIN_DAYS = 14
const MIN_TX = 15
const MIN_PCT = 15 // significance threshold

export const HeadlineInsights = ({ expenses, periodMonths, onNavigate }) => {
  const insights = useMemo(() => {
    if (!expenses.length) return []

    // -----------------------------
    // 1. Peak weekday (avg per occurrence)
    // -----------------------------
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth() - (periodMonths - 1), 1)

    const periodExpenses = expenses.filter(
      tx => toMYDate(tx.transaction_date) >= periodStart
    )

    const dayCount = new Set()
    periodExpenses.forEach(tx => dayCount.add(dayKey(tx.transaction_date)))

    if (dayCount.size < MIN_DAYS || periodExpenses.length < MIN_TX) return []

    const totalsByWeekday = [0, 0, 0, 0, 0, 0, 0]
    const occurrencesByWeekday = [0, 0, 0, 0, 0, 0, 0]

    // Count occurrences of each weekday in the period
    const start = new Date(periodStart)
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

    // -----------------------------
    // 2. Weekend vs weekday
    // -----------------------------
    const weekendDays = occurrencesByWeekday[5] + occurrencesByWeekday[6]
    const weekendTotal = totalsByWeekday[5] + totalsByWeekday[6]
    const weekendAvg = weekendDays > 0 ? weekendTotal / weekendDays : 0

    const weekdayDays = occurrencesByWeekday.slice(0, 5).reduce((a, b) => a + b, 0)
    const weekdayTotal = totalsByWeekday.slice(0, 5).reduce((a, b) => a + b, 0)
    const weekdayAvg = weekdayDays > 0 ? weekdayTotal / weekdayDays : 0

    const weekendGap = weekdayAvg > 0
      ? ((weekendAvg - weekdayAvg) / weekdayAvg) * 100
      : 0

    // -----------------------------
    // 3. Biggest category increase (this month vs last)
    // -----------------------------
    const thisMonthKey = monthKey(now)
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthKey = monthKey(lastMonthDate)

    const mainCat = (cat) => (cat || 'Uncategorized').split(' > ')[0]
    const thisCatTotals = {}
    const lastCatTotals = {}

    expenses.forEach(tx => {
      const k = monthKey(tx.transaction_date)
      const c = mainCat(tx.category)
      const amt = Number(tx.amount) || 0
      if (k === thisMonthKey) thisCatTotals[c] = (thisCatTotals[c] || 0) + amt
      else if (k === lastMonthKey) lastCatTotals[c] = (lastCatTotals[c] || 0) + amt
    })

    let biggestIncrease = null
    Object.keys(thisCatTotals).forEach(c => {
      const diff = (thisCatTotals[c] || 0) - (lastCatTotals[c] || 0)
      if (diff > 0 && (!biggestIncrease || diff > biggestIncrease.diff)) {
        biggestIncrease = { category: c, diff, thisTotal: thisCatTotals[c], lastTotal: lastCatTotals[c] || 0 }
      }
    })

    // -----------------------------
    // 4. MTD pace
    // -----------------------------
    const dayOfMonth = toMYDate(now).getUTCDate()

    const mtd = expenses
      .filter(tx => {
        const d = toMYDate(tx.transaction_date)
        return d.getUTCFullYear() === now.getFullYear() &&
               d.getUTCMonth() === now.getMonth() &&
               d.getUTCDate() <= dayOfMonth
      })
      .reduce((s, tx) => s + Number(tx.amount), 0)

    const lastMTD = expenses
      .filter(tx => {
        const d = toMYDate(tx.transaction_date)
        return d.getUTCFullYear() === lastMonthDate.getFullYear() &&
               d.getUTCMonth() === lastMonthDate.getMonth() &&
               d.getUTCDate() <= dayOfMonth
      })
      .reduce((s, tx) => s + Number(tx.amount), 0)

    const mtdPct = lastMTD > 0 ? ((mtd - lastMTD) / lastMTD) * 100 : null

    // -----------------------------
    // Build insight cards
    // -----------------------------
    const cards = []

    if (peakAvg > 0) {
      cards.push({
        id: 'peak_weekday',
        icon: Calendar,
        sentence: (
          <>You spend the most on <strong>{WEEKDAY_LABELS[peakIdx]}s</strong>, about <strong>{formatMYR(peakAvg)}</strong> on average.</>
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
          <><strong>{biggestIncrease.category}</strong> went up <strong>{formatMYR(biggestIncrease.diff)}</strong> vs last month.</>
        ),
        score: biggestIncrease.diff,
        tone: 'up',
        navigateTo: 'categories'
      })
    }

    if (mtdPct !== null && Math.abs(mtdPct) >= MIN_PCT) {
      cards.push({
        id: 'mtd_pace',
        icon: mtdPct > 0 ? TrendingUp : TrendingDown,
        sentence: (
          <>Month-to-date spending is <strong>{mtdPct > 0 ? 'up' : 'down'} {Math.abs(mtdPct).toFixed(0)}%</strong> vs the same days last month.</>
        ),
        score: Math.abs(mtdPct) * 5,
        tone: mtdPct > 0 ? 'up' : 'down',
        navigateTo: 'categories'
      })
    }

    // Rank by score, keep top 4
    return cards.sort((a, b) => b.score - a.score).slice(0, 4)
  }, [expenses, periodMonths])

  if (insights.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
        <EmptyState
          icon={Sparkles}
          title="Keep logging to unlock insights"
          message="We need about 14 days of data or 15 transactions before we can spot patterns."
        />
      </div>
    )
  }

  const toneStyles = {
    up: { color: COLORS.up, bg: 'bg-red-50', border: 'border-red-100' },
    down: { color: COLORS.down, bg: 'bg-emerald-50', border: 'border-emerald-100' },
    neutral: { color: COLORS.neutral, bg: 'bg-slate-50', border: 'border-slate-100' }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      {insights.map(card => {
        const Icon = card.icon
        const tone = toneStyles[card.tone] || toneStyles.neutral
        return (
          <button
            key={card.id}
            onClick={() => card.navigateTo && onNavigate?.(card.navigateTo)}
            className={`text-left bg-white/60 backdrop-blur-xl border ${tone.border} rounded-2xl p-4 shadow-sm hover:bg-white transition-all group flex items-start gap-3`}
          >
            <div
              className={`w-9 h-9 ${tone.bg} rounded-xl flex items-center justify-center shrink-0`}
              style={{ color: tone.color }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-sm text-slate-700 leading-relaxed flex-1">
              {card.sentence}
            </p>
          </button>
        )
      })}
    </div>
  )
}