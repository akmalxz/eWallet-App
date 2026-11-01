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

export const TIGHT_THRESHOLD = 0.90
export const CRITICAL_RUNWAY_DAYS = 7
export const NEAR_PAYDAY_DAYS = 5

export const PREV_CYCLE_TRIM_FRACTION = 0.10

const trimmedMean = (values, trimFraction = PREV_CYCLE_TRIM_FRACTION) => {
  const valid = values.filter(Number.isFinite)
  if (valid.length === 0) return 0
  if (valid.length < 5) {
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

// Liquidity helpers
const isSemiLiquid = (acc) => ['fixed_price_ut', 'pilgrimage'].includes(acc.classification)
const isLocked = (acc) => ['investment', 'credit'].includes(acc.classification)

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
  paydayDate = null,
  includeSavings = true // <-- NEW
}) => {
  const { scopedAccounts, accountIds, scopeLabel } = resolveAccountScope(
    accounts,
    scopeAccountId
  )

  // 1. Dates & Cycles
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

  // 2. Balance (Liquidity Tier filtering)
  let balance = 0
  let excludedSavingsBalance = 0

  for (const acc of scopedAccounts) {
    if (isLocked(acc)) continue

    if (!includeSavings && isSemiLiquid(acc)) {
      excludedSavingsBalance += Number(acc.balance) || 0
      continue
    }
    
    balance += Number(acc.balance) || 0
  }

  // 3. Bills before payday
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

  // 4. Everyday spending (Cycle-aware)
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

  // 5. Daily average + early-cycle blend
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

  // 6. Safe daily spend
  const safeDailySpend = (daysToPayday > 0 && freeMoney > 0)
    ? freeMoney / daysToPayday
    : 0

  // 7. Runway
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

  // 8. Trend
  const thisCycleGrossDailyAvg = thisCycleEveryday / daysPassed
  const prevCycleSamePeriodDailyAvg = daysPassed > 0
    ? prevCycleSamePeriodTotal / Math.min(daysPassed, prevCycleLength)
    : 0
  const spendingTrend = prevCycleSamePeriodDailyAvg > 0
    ? ((thisCycleGrossDailyAvg - prevCycleSamePeriodDailyAvg) / prevCycleSamePeriodDailyAvg) * 100
    : 0

  // 9. Status
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

  return {
    scopeLabel,
    now,
    payday,
    isPaydayToday: paydayToday,

    balance,
    excludedSavingsBalance, // <-- Expose for UI transparency
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