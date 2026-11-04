// src/hooks/useSavingsRate.js
import { useMemo } from 'react'
import { getPayCycle } from '../utils/dateHelpers'

const WEALTH_CLASSIFICATIONS = new Set([
  'fixed_price_ut',
  'pilgrimage',
  'investment'
])

/**
 * Computes savings rate for the current and previous pay cycles.
 *
 *   savings_rate = (income − consumption) / income
 *
 * Classification rules — kept in lockstep with useAnalyticsData:
 *
 *   - Any transaction whose category starts with "Income" is income,
 *     regardless of source/destination shape. This handles the common
 *     mislogging pattern where salary is recorded as an expense from
 *     the main account (source set, destination null).
 *   - Transfers (both source and destination set) are neither income
 *     nor consumption.
 *   - Transfers into wealth-classified accounts (ASB/TH/Investment)
 *     contribute to `wealthContribution` — a subset of "kept".
 *   - `needs_review` transactions are INCLUDED. Pending OCR entries
 *     represent real money movement; only their category is uncertain.
 *     This matches burnRateEngine and useAnalyticsData.
 *
 * @param {object} opts
 * @param {Array} opts.transactions  from useTransactions.monthlyExpenses
 *                                   (guaranteed destination null)
 * @param {Array} opts.inflows       from useTransactions.monthlyInflows
 *                                   (guaranteed destination set)
 * @param {Array} opts.accounts      used to identify wealth destinations
 * @param {object} opts.profile      payday config
 * @returns {{
 *   current:  { income: number, consumption: number, savings: number,
 *               rate: number|null, wealthContribution: number },
 *   previous: { income: number, consumption: number, savings: number,
 *               rate: number|null, wealthContribution: number },
 *   trendPctPoints: number|null,
 *   hasIncome: boolean
 * }}
 */
export function useSavingsRate({
  transactions = [],
  inflows = [],
  accounts = [],
  profile
}) {
  return useMemo(() => {
    const paydayType = profile?.payday_type
    const paydayDate = profile?.payday_date
    const now = new Date()

    const { startDate: currentStart, endDate: currentEnd } = getPayCycle(
      now, paydayType, paydayDate
    )
    const prevEndSeed = new Date(currentStart.getTime() - 86400000)
    const { startDate: prevStart, endDate: prevEnd } = getPayCycle(
      prevEndSeed, paydayType, paydayDate
    )

    const inRange = (dateStr, start, end) => {
      const d = new Date(dateStr)
      return d >= start && d <= end
    }

    const isIncomeCategory = (tx) =>
      (tx.category || '').toLowerCase().trim().startsWith('income')

    const wealthIds = new Set(
      accounts
        .filter(a =>
          !a.is_archived &&
          WEALTH_CLASSIFICATIONS.has(a.classification)
        )
        .map(a => a.id)
    )

    const calcForRange = (start, end) => {
      let income = 0
      let consumption = 0
      let wealthContribution = 0

      // `transactions` = source-set, destination-null (from monthlyExpenses).
      // Income-categorised entries are mislogged salaries — counted as
      // income, not consumption. Range check MUST precede classification:
      // otherwise a salary dated outside this cycle would be counted in
      // every cycle's income.
      for (const tx of transactions) {
        if (!inRange(tx.transaction_date, start, end)) continue

        if (isIncomeCategory(tx)) {
          income += Number(tx.amount) || 0
          continue
        }

        consumption += Number(tx.amount) || 0
      }

      // `inflows` = destination-set (from monthlyInflows). Income and
      // wealth contributions are both extracted from this list.
      for (const tx of inflows) {
        if (!inRange(tx.transaction_date, start, end)) continue

        // Pure income (source null) OR mislogged salary logged as a
        // transfer with an Income category.
        if (!tx.source_account_id || isIncomeCategory(tx)) {
          income += Number(tx.amount) || 0
          continue
        }

        // Otherwise it's a transfer. Count only new transfers into wealth
        // from non-wealth accounts (not intra-wealth transfers).
        if (wealthIds.has(tx.destination_account_id) && !wealthIds.has(tx.source_account_id)) {
          wealthContribution += Number(tx.amount) || 0
        }
      }

      const savings = income - consumption
      const rate = income > 0 ? (savings / income) * 100 : null

      return { income, consumption, savings, rate, wealthContribution }
    }

    const current = calcForRange(currentStart, currentEnd)
    const previous = calcForRange(prevStart, prevEnd)

    const trendPctPoints =
      current.rate !== null && previous.rate !== null
        ? current.rate - previous.rate
        : null

    return {
      current,
      previous,
      trendPctPoints,
      hasIncome: current.income > 0
    }
  }, [
    transactions,
    inflows,
    accounts,
    profile?.payday_type,
    profile?.payday_date
  ])
}