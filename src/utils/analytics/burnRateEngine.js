// src/utils/analytics/burnRateEngine.js
import {
  toMYDate,
  monthKey,
  getDaysInMonthMY,
  getDayOfMonthMY,
  nextPayday,
  isTodayPayday,
  daysBetweenMY,
  getPayCycle // <-- Added
} from '../dateHelpers'
import { resolveAccountScope } from '../accounts/accountScope'
import { computeCommitmentSchedule } from '../commitments/commitmentSchedule'

// ===========================================================================
// Named thresholds
// ===========================================================================
export const TIGHT_THRESHOLD = 0.90
export const CRITICAL_RUNWAY_DAYS = 7
export const NEAR_PAYDAY_DAYS = 5

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

  // Get current pay cycle and previous pay cycle
  const { startDate: cycleStart } = getPayCycle(now, paydayType, paydayDate)
  const prevCycleEndSeed = new Date(cycleStart.getTime() - 86400000)
  const { startDate: prevCycleStart, endDate: prevCycleEnd } = getPayCycle(prevCycleEndSeed, paydayType, paydayDate)

  // Days passed since the cycle started (minimum 1 to avoid division by zero)
  const daysPassed = Math.max(1, daysBetweenMY(cycleStart, now) + 1)
  
  // Total length of the previous cycle (used for fallback average)
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
  // ------------------------------------------------------------
  let thisCycleEveryday = 0
  let prevCycleEverydayTotal = 0
  let prevCycleSamePeriodTotal = 0
  let reviewCount = 0

  // Calculate the end date for the "same period" comparison in the previous cycle
  const prevCycleSamePeriodEnd = new Date(prevCycleStart.getTime() + (daysPassed - 1) * 86400000)

  for (const tx of expenses) {
    if (!accountIds.has(tx.source_account_id)) continue
    if (!isRealExpense(tx)) continue
    if (tx.needs_review) reviewCount++
    if (isCommitmentPayment(tx)) continue

    const txDate = toMYDate(tx.transaction_date)
    
    // Check if in current cycle
    if (txDate >= cycleStart && txDate <= now) {
      thisCycleEveryday += Number(tx.amount) || 0
    } 
    // Check if in previous cycle
    else if (txDate >= prevCycleStart && txDate <= prevCycleEnd) {
      prevCycleEverydayTotal += Number(tx.amount) || 0
      
      // Check if in the "same period" of the previous cycle
      if (txDate <= prevCycleSamePeriodEnd) {
        prevCycleSamePeriodTotal += Number(tx.amount) || 0
      }
    }
  }

  // Receivables adjustment
  const receivablesOffset = Math.max(0, Number(receivablesThisMonth) || 0)
  const netThisCycleEveryday = Math.max(0, thisCycleEveryday - receivablesOffset)

  // ------------------------------------------------------------
  // 5. Daily average + early-cycle blend
  // ------------------------------------------------------------
  const rawDailyAvg = netThisCycleEveryday / daysPassed
  const prevCycleDailyAvg = prevCycleEverydayTotal / prevCycleLength

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
  } else if (netThisCycleEveryday === 0 && billCount === 0) {
    status = 'no_data'
  } else if (netThisCycleEveryday === 0) {
    status = 'no_data'
  } else if (freeMoney < 0) {
    status = 'bills_exceed_balance'
    shortfall = Math.abs(freeMoney)
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
    everydaySpentThisMonth: netThisCycleEveryday, // Keeping the key name for backwards compatibility with the widget
    rawEverydaySpentThisMonth: thisCycleEveryday,
    receivablesOffset,
    dailyAverage,
    safeDailySpend,
    runwayDays,
    daysToPayday,
    daysPassed,
    monthLength: prevCycleLength, // Repurposed for the UI

    runoutDate,
    runsOutBeforePayday,
    expectedBalanceAtPayday,

    spendingTrend,
    isEarlyMonth: isEarlyCycle, // Keeping key name for UI

    reviewCount,
    billCount,

    status,
    shortfall
  }
}