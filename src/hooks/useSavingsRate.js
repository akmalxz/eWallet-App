// src/hooks/useSavingsRate.js
import { useMemo } from 'react'
import { getPayCycle, toMYDate } from '../utils/dateHelpers'

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
 * Consumption:
 *   - expense transactions (source set, destination null — guaranteed
 *     by the query that feeds `transactions`)
 *   - excludes needs_review
 *   - excludes any transaction whose category starts with "Income"
 *     (covers the rare case where a user logged salary as an expense)
 *
 * Income:
 *   - inflows where source_account_id is null (true income)
 *   - OR inflows whose category starts with "Income" (mislogged salary
 *     that has both source and destination set)
 *
 * Wealth contribution:
 *   - inflows whose destination is a wealth account
 *   - a subset of "kept" — the difference between kept and contribution
 *     is money that stayed in cash
 *
 * @param {object} opts
 * @param {Array} opts.transactions  from useTransactions.monthlyExpenses
 * @param {Array} opts.inflows       from useTransactions.monthlyInflows
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
      const d = toMYDate(dateStr)
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

      // Consumption: expenses in range
      for (const tx of transactions) {
        if (tx.needs_review) continue
        if (isIncomeCategory(tx)) continue
        if (!inRange(tx.transaction_date, start, end)) continue
        consumption += Number(tx.amount) || 0
      }

      // Income + wealth contributions: inflows in range
      for (const tx of inflows) {
        if (tx.needs_review) continue
        if (!inRange(tx.transaction_date, start, end)) continue

        // Pure income (source null) OR mislogged salary (Income category)
        if (!tx.source_account_id || isIncomeCategory(tx)) {
          income += Number(tx.amount) || 0
          continue
        }

        // Otherwise it's a transfer. Count only transfers into wealth.
        if (wealthIds.has(tx.destination_account_id)) {
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