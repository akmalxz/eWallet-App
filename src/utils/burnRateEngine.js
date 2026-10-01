// src/utils/burnRateEngine.js
import {
  toMYDate,
  monthKey,
  getDaysInMonthMY,
  getDayOfMonthMY,
  nextPayday,
  isTodayPayday,
  daysBetweenMY
} from './dateHelpers'
import { resolveAccountScope } from './accountScope'
import { computeCommitmentSchedule } from './commitmentSchedule'

// ===========================================================================
// Named thresholds (Phase 5)
// ===========================================================================
export const TIGHT_THRESHOLD = 0.90        // daily avg ≥ 90% of safe = "Tight"
export const CRITICAL_RUNWAY_DAYS = 7      // runway < this = red marker
export const NEAR_PAYDAY_DAYS = 5          // runout within this of payday = amber

// ===========================================================================
// Classification (Phase 2)
// ===========================================================================

/**
 * A transaction is a commitment payment if:
 *   1. Its metadata has a commitment_id, OR
 *   2. Its category is "Commitments"
 */
export const isCommitmentPayment = (tx) => {
  if (!tx) return false
  const meta = tx.metadata
  if (meta && typeof meta === 'object' && meta.commitment_id) return true
  const cat = (tx.category || '').trim()
  return cat === 'Commitments'
}

/**
 * A real expense is one with a source account, no destination (transfers
 * excluded), and a positive amount.
 */
export const isRealExpense = (tx) => {
  if (!tx) return false
  if (!tx.source_account_id) return false
  if (tx.destination_account_id) return false
  const amt = Number(tx.amount) || 0
  return amt > 0
}

// ===========================================================================
// Main engine (Phases 3, 4, 5)
// ===========================================================================
export const computeBurnRate = ({
  accounts = [],
  expenses = [],
  commitments = [],
  payments = [],
  scopeAccountId = 'all',
  now = new Date(),
  isHoliday = () => false
}) => {
  // ------------------------------------------------------------
  // 1. Scope (P3.2 — shared with the radar)
  // ------------------------------------------------------------
  const { scopedAccounts, accountIds, scopeLabel } = resolveAccountScope(
    accounts,
    scopeAccountId
  )

  // ------------------------------------------------------------
  // 2. Dates
  // ------------------------------------------------------------
  const payday = nextPayday(now, isHoliday)
  const paydayToday = isTodayPayday(now, isHoliday)
  const daysToPayday = Math.max(0, daysBetweenMY(now, payday))
  const daysPassed = getDayOfMonthMY(now)
  const monthLength = getDaysInMonthMY(now)

  // ------------------------------------------------------------
  // 3. Balance (P3.2)
  // ------------------------------------------------------------
  const balance = scopedAccounts.reduce(
    (s, a) => s + (Number(a.balance) || 0),
    0
  )

  // ------------------------------------------------------------
  // 4. Bills before payday (P3.3 — shared schedule function)
  // ------------------------------------------------------------
  const schedule = computeCommitmentSchedule({
    commitments,
    payments,
    accounts,
    scopeAccountId,
    now,
    horizon: payday
  })

  const billsBeforePayday = schedule.total
  const billCount = schedule.unpaidPeriods.length

  // ------------------------------------------------------------
  // 5. Free money
  // ------------------------------------------------------------
  const freeMoney = balance - billsBeforePayday

  // ------------------------------------------------------------
  // 6. Everyday spending (Phases 2 & 3)
  // ------------------------------------------------------------
  const thisMonthK = monthKey(now)
  const nowMY = toMYDate(now)
  const lastMonthDate = new Date(Date.UTC(nowMY.getUTCFullYear(), nowMY.getUTCMonth() - 1, 1))
  const lastMonthK = monthKey(lastMonthDate)
  const lastMonthLength = getDaysInMonthMY(lastMonthDate)

  let thisMonthEveryday = 0
  let lastMonthEverydayTotal = 0
  let lastMonthSamePeriodTotal = 0
  let reviewCount = 0

  for (const tx of expenses) {
    // Scope
    if (!accountIds.has(tx.source_account_id)) continue
    // Real expenses only (skip transfers, zero/negative)
    if (!isRealExpense(tx)) continue

    // Count review items — applies to all expenses regardless of class
    if (tx.needs_review) reviewCount++

    // Skip commitment payments from everyday spending
    if (isCommitmentPayment(tx)) continue

    const k = monthKey(tx.transaction_date)
    const amt = Number(tx.amount) || 0

    if (k === thisMonthK) {
      thisMonthEveryday += amt
    } else if (k === lastMonthK) {
      lastMonthEverydayTotal += amt
      const d = toMYDate(tx.transaction_date)
      if (d.getUTCDate() <= daysPassed) {
        lastMonthSamePeriodTotal += amt
      }
    }
  }

  // ------------------------------------------------------------
  // 7. Daily average + early-month blend (Phase 5.6, 5.7)
  // ------------------------------------------------------------
  const rawDailyAvg = daysPassed > 0 ? thisMonthEveryday / daysPassed : 0
  const lastMonthDailyAvg = lastMonthLength > 0
    ? lastMonthEverydayTotal / lastMonthLength
    : 0

  const isEarlyMonth = daysPassed <= 3
  const dailyAverage = (isEarlyMonth && lastMonthDailyAvg > 0)
    ? (rawDailyAvg * daysPassed + lastMonthDailyAvg * (3 - daysPassed)) / 3
    : rawDailyAvg

  // ------------------------------------------------------------
  // 8. Safe daily spend (Phase 5.8)
  // ------------------------------------------------------------
  const safeDailySpend = (daysToPayday > 0 && freeMoney > 0)
    ? freeMoney / daysToPayday
    : 0

  // ------------------------------------------------------------
  // 9. Runway (Phase 5.9)
  // ------------------------------------------------------------
  let runwayDays
  if (freeMoney < 0) {
    runwayDays = 0
  } else if (dailyAverage <= 0) {
    runwayDays = 9999  // sentinel for infinite
  } else {
    runwayDays = Math.floor(freeMoney / dailyAverage)
  }

  // ------------------------------------------------------------
  // 10. Runs out before payday? (Phase 5.10)
  // Strictly less than daysToPayday, and free money must be non-negative.
  // ------------------------------------------------------------
  const runsOutBeforePayday =
    freeMoney >= 0 &&
    dailyAverage > 0 &&
    daysToPayday > 0 &&
    runwayDays < daysToPayday

  // ------------------------------------------------------------
  // 11. Runout date (Phase 5.11)
  // ------------------------------------------------------------
  const runoutDate = runsOutBeforePayday
    ? new Date(
        nowMY.getUTCFullYear(),
        nowMY.getUTCMonth(),
        nowMY.getUTCDate() + runwayDays
      )
    : null

  // ------------------------------------------------------------
  // 12. Expected balance at payday (Phase 5.12)
  // ------------------------------------------------------------
  const expectedBalanceAtPayday =
    freeMoney - (dailyAverage * daysToPayday)

  // ------------------------------------------------------------
  // 13. Trend (Phase 5.13)
  // ------------------------------------------------------------
  const lastSamePeriodDailyAvg = daysPassed > 0
    ? lastMonthSamePeriodTotal / daysPassed
    : 0
  const spendingTrend = lastSamePeriodDailyAvg > 0
    ? ((rawDailyAvg - lastSamePeriodDailyAvg) / lastSamePeriodDailyAvg) * 100
    : 0

  // ------------------------------------------------------------
  // 14. Status (Phase 5)
  // ------------------------------------------------------------
  let status
  let shortfall = 0

  if (paydayToday) {
    status = 'payday_today'
  } else if (thisMonthEveryday === 0 && billCount === 0) {
    // No everyday spending AND no bills — nothing to show
    status = 'no_data'
  } else if (thisMonthEveryday === 0) {
    // No everyday spending but there are bills — treat as no_data for the average
    // but still expose free money. Status remains 'no_data'.
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
    // Context
    scopeLabel,
    now,
    payday,
    isPaydayToday: paydayToday,

    // Numbers
    balance,
    billsBeforePayday,
    freeMoney,
    everydaySpentThisMonth: thisMonthEveryday,
    dailyAverage,
    safeDailySpend,
    runwayDays,
    daysToPayday,
    daysPassed,
    monthLength,

    // Dates
    runoutDate,
    runsOutBeforePayday,
    expectedBalanceAtPayday,

    // Trend
    spendingTrend,
    isEarlyMonth,

    // Counts
    reviewCount,
    billCount,

    // Status
    status,
    shortfall
  }
}