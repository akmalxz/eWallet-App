// src/utils/analytics/burnRateEngine.js
import {
  toMYDate,
  monthKey,
  getDaysInMonthMY,
  getDayOfMonthMY,
  nextPayday,
  isTodayPayday,
  daysBetweenMY,
  getPayCycle,
  dayKey
} from '../dateHelpers'
import { resolveAccountScope } from '../accounts/accountScope'
import { computeCommitmentSchedule } from '../commitments/commitmentSchedule'

// ===========================================================================
// Named thresholds
// ===========================================================================
export const TIGHT_THRESHOLD = 0.90
export const CRITICAL_RUNWAY_DAYS = 7
export const NEAR_PAYDAY_DAYS = 5

// Fraction trimmed from EACH end when computing the "typical" previous-cycle
// daily spend. 10% on a 30-day cycle means the highest 3 and lowest 3 days
// are excluded — enough to neutralise a one-off large purchase without
// discarding legitimate variance.
export const PREV_CYCLE_TRIM_FRACTION = 0.10

// ===========================================================================
// Statistical helpers
// ===========================================================================
/**
 * Trimmed mean — drop the top and bottom `trimFraction` of values,
 * average the rest.
 *
 * Used for `prevCycleDailyAvg` so a single big purchase in the previous
 * cycle doesn't inflate the fallback prior that gets blended into the
 * first two days of the current cycle.
 */
const trimmedMean = (values, trimFraction = PREV_CYCLE_TRIM_FRACTION) => {
  const valid = values.filter(Number.isFinite)
  if (valid.length === 0) return 0
  if (valid.length < 5) {
    // Too few samples to trim meaningfully — plain mean is fine.
    return valid.reduce((s, v) => s + v, 0) / valid.length
  }
  const sorted = [...valid].sort((a, b) => a - b)
  const trimCount = Math.floor(sorted.length * trimFraction)
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount)
  if (trimmed.length === 0) {
    return sorted.reduce((a, b) => a + b, 0) / sorted.length
  }
  return trimmed.reduce((s, v) => s + v, 0) / trimmed.length
}

// ===========================================================================
// Classification
// ===========================================================================
export const isCommitmentPayment = (tx) => {
  if (!tx) return false
  const meta = tx.metadata
  if (meta && typeof meta === 'object' && meta.commitment_id) return true
  const cat = (tx.category || '').trim()
  return cat === 'Commitments'
}

export const isRealExpense = (tx) => {
  if (!tx) return false
  if (!tx.source_account_id) return false
  if (tx.destination_account_id) return false
  const amt = Number(tx.amount) || 0
  return amt > 0
}

// ===========================================================================
// Main engine
// ===========================================================================
export const computeBurnRate = ({
  accounts = [],
  expenses = [],
  commitments = [],
  payments = [],
  scopeAccountId = 'all',
  now = new Date(),
  isHoliday = () => false,
  receivablesThisMonth = 0,
  paydayType = 'last_working_day',
  paydayDate = null
}) => {
  const { scopedAccounts, accountIds, scopeLabel } = resolveAccountScope(
    accounts,
    scopeAccountId
  )

  // ------------------------------------------------------------
  // 1. Dates & Cycles
  // ------------------------------------------------------------
  const payday = nextPayday(now, isHoliday, paydayType, paydayDate)
  const paydayToday = isTodayPayday(now, isHoliday, paydayType, paydayDate)
  const daysToPayday = Math.max(0, daysBetweenMY(now, payday))

  const { startDate: cycleStart } = getPayCycle(now, paydayType, paydayDate)
  const prevCycleEndSeed = new Date(cycleStart.getTime() - 86400000)
  const { startDate: prevCycleStart, endDate: prevCycleEnd } = getPayCycle(
    prevCycleEndSeed,
    paydayType,
    paydayDate
  )

  const daysPassed = Math.max(1, daysBetweenMY(cycleStart, now) + 1)
  const prevCycleLength = Math.max(1, daysBetweenMY(prevCycleStart, prevCycleEnd) + 1)

  // ------------------------------------------------------------
  // 2. Balance
  // ------------------------------------------------------------
  const balance = scopedAccounts.reduce(
    (s, a) => s + (Number(a.balance) || 0),
    0
  )

  // ------------------------------------------------------------
  // 3. Bills before payday
  // ------------------------------------------------------------
  const schedule = computeCommitmentSchedule({
    commitments,
    payments,
    accounts,
    scopeAccountId,
    now,
    horizon: payday,
    paydayType,
    paydayDate
  })

  const billsBeforePayday = schedule.total
  const billCount = schedule.unpaidPeriods.length
  const freeMoney = balance - billsBeforePayday

  // ------------------------------------------------------------
  // 4. Everyday spending (Cycle-aware)
  //
  // prevCycleDailyTotals accumulates per-day spend for the previous
  // cycle so we can compute a robust "typical daily rate" afterwards.
  // ------------------------------------------------------------
  let thisCycleEveryday = 0
  let prevCycleSamePeriodTotal = 0
  let reviewCount = 0
  const prevCycleDailyTotals = new Map()

  const prevCycleSamePeriodEnd = new Date(
    prevCycleStart.getTime() + (daysPassed - 1) * 86400000
  )

  for (const tx of expenses) {
    if (!accountIds.has(tx.source_account_id)) continue
    if (!isRealExpense(tx)) continue
    if (tx.needs_review) reviewCount++
    if (isCommitmentPayment(tx)) continue

    const txDate = toMYDate(tx.transaction_date)

    if (txDate >= cycleStart && txDate <= now) {
      thisCycleEveryday += Number(tx.amount) || 0
    } else if (txDate >= prevCycleStart && txDate <= prevCycleEnd) {
      const k = dayKey(tx.transaction_date)
      prevCycleDailyTotals.set(
        k,
        (prevCycleDailyTotals.get(k) || 0) + (Number(tx.amount) || 0)
      )
      if (txDate <= prevCycleSamePeriodEnd) {
        prevCycleSamePeriodTotal += Number(tx.amount) || 0
      }
    }
  }

  const receivablesOffset = Math.max(0, Number(receivablesThisMonth) || 0)
  const netThisCycleEveryday = Math.max(0, thisCycleEveryday - receivablesOffset)

  // ------------------------------------------------------------
  // 5. Daily average + early-cycle blend
  //
  // prevCycleDailyAvg is a trimmed mean of per-day totals (zero-days
  // included — a day with no spend is a real data point for a rate).
  // This makes the early-cycle blend robust to one-off large purchases
  // in the previous cycle.
  // ------------------------------------------------------------
  const prevCycleDaysList = []
  for (let i = 0; i < prevCycleLength; i++) {
    const dayDate = new Date(prevCycleStart.getTime() + i * 86400000)
    const k = dayKey(dayDate)
    prevCycleDaysList.push(prevCycleDailyTotals.get(k) || 0)
  }
  const prevCycleDailyAvg = trimmedMean(prevCycleDaysList)

  const rawDailyAvg = netThisCycleEveryday / daysPassed

  const isEarlyCycle = daysPassed <= 3
  const dailyAverage = (isEarlyCycle && prevCycleDailyAvg > 0)
    ? (rawDailyAvg * daysPassed + prevCycleDailyAvg * (3 - daysPassed)) / 3
    : rawDailyAvg

  // ------------------------------------------------------------
  // 6. Safe daily spend
  // ------------------------------------------------------------
  const safeDailySpend = (daysToPayday > 0 && freeMoney > 0)
    ? freeMoney / daysToPayday
    : 0

  // ------------------------------------------------------------
  // 7. Runway
  // ------------------------------------------------------------
  let runwayDays
  if (freeMoney < 0) {
    runwayDays = 0
  } else if (dailyAverage <= 0) {
    runwayDays = 9999
  } else {
    runwayDays = Math.floor(freeMoney / dailyAverage)
  }

  const runsOutBeforePayday =
    freeMoney >= 0 &&
    dailyAverage > 0 &&
    daysToPayday > 0 &&
    runwayDays < daysToPayday

  const runoutDate = runsOutBeforePayday
    ? new Date(
        toMYDate(now).getUTCFullYear(),
        toMYDate(now).getUTCMonth(),
        toMYDate(now).getUTCDate() + runwayDays
      )
    : null

  const expectedBalanceAtPayday =
    freeMoney - (dailyAverage * daysToPayday)

  // ------------------------------------------------------------
  // 8. Trend
  // ------------------------------------------------------------
  const prevCycleSamePeriodDailyAvg = daysPassed > 0
    ? prevCycleSamePeriodTotal / daysPassed
    : 0
  const spendingTrend = prevCycleSamePeriodDailyAvg > 0
    ? ((rawDailyAvg - prevCycleSamePeriodDailyAvg) / prevCycleSamePeriodDailyAvg) * 100
    : 0

  // ------------------------------------------------------------
  // 9. Status
  // ------------------------------------------------------------
  let status
  let shortfall = 0

  if (paydayToday) {
    status = 'payday_today'
  } else if (freeMoney < 0) {
    status = 'bills_exceed_balance'
    shortfall = Math.abs(freeMoney)
  } else if (netThisCycleEveryday === 0) {
    status = 'no_data'
  } else if (runsOutBeforePayday) {
    status = 'at_risk'
  } else if (
    safeDailySpend > 0 &&
    dailyAverage >= safeDailySpend * TIGHT_THRESHOLD &&
    dailyAverage <= safeDailySpend
  ) {
    status = 'tight'
  } else {
    status = 'on_track'
  }

  // ------------------------------------------------------------
  // Return
  // ------------------------------------------------------------
  return {
    scopeLabel,
    now,
    payday,
    isPaydayToday: paydayToday,

    balance,
    billsBeforePayday,
    freeMoney,
    everydaySpentThisMonth: netThisCycleEveryday,
    rawEverydaySpentThisMonth: thisCycleEveryday,
    receivablesOffset,
    dailyAverage,
    safeDailySpend,
    runwayDays,
    daysToPayday,
    daysPassed,
    monthLength: prevCycleLength,

    runoutDate,
    runsOutBeforePayday,
    expectedBalanceAtPayday,

    spendingTrend,
    isEarlyMonth: isEarlyCycle,

    reviewCount,
    billCount,

    status,
    shortfall
  }
}