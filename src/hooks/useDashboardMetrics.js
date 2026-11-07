// src/hooks/useDashboardMetrics.js
import { useMemo } from 'react'
import { computeBurnRate } from '../utils/analytics/burnRateEngine'
import { computeCashFlow } from '../utils/analytics/cashFlowEngine'
import { computeCommitmentSchedule } from '../utils/commitments/commitmentSchedule'

export function useDashboardMetrics({
  accounts,
  commitments,
  commitmentPayments,
  monthlyExpenses,
  scopeAccountId = 'all',
  receivablesThisMonth = 0,
  profile,
  includeSavings = true // <-- NEW
}) {
  const radarSchedule = useMemo(() => {
    return computeCommitmentSchedule({
      commitments,
      payments: commitmentPayments,
      accounts,
      scopeAccountId: 'all',
      now: new Date(),
      paydayType: profile?.payday_type,
      paydayDate: profile?.payday_date
    })
  }, [commitments, commitmentPayments, accounts, profile?.payday_type, profile?.payday_date])

  const radarStats = useMemo(() => {
    // Bill-funding accounts (active commitments with an assigned account)
    const billAccountIds = new Set(
      (commitments || [])
        .filter((c) => c.is_active && c.account_id)
        .map((c) => c.account_id)
    )

    // Option 1: Operational Cash Only.
    // Exclude locked / semi-liquid wealth accounts (ASB, Tabung Haji, Investments, Credit Cards).
    // Exclude savings accounts UNLESS the user explicitly assigned an active bill to it.
    const NON_OPERATIONAL_CLASSES = new Set([
      'savings',
      'fixed_price_ut',
      'pilgrimage',
      'investment',
      'credit'
    ])

    const currentBalance = (accounts || [])
      .filter((a) => {
        if (a.is_archived) return false
        const cls = (a.classification || '').toLowerCase()
        if (cls === 'credit') return false

        // Always include operational accounts (hub, ewallet, digital_bank, or general asset)
        if (!NON_OPERATIONAL_CLASSES.has(cls)) return true

        // For savings accounts, include ONLY if explicitly designated to pay an active bill
        if (cls === 'savings' && billAccountIds.has(a.id)) return true

        return false
      })
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0)

    const totalRequired = radarSchedule.total
    const isSafe = currentBalance >= totalRequired

    return {
      currentBalance,
      totalRequired,
      unpaidCount: radarSchedule.unpaidPeriods.length,
      isSafe,
      shortfall: Math.max(0, totalRequired - currentBalance)
    }
  }, [accounts, commitments, radarSchedule])

  const velocityStats = useMemo(() => {
    return computeBurnRate({
      accounts,
      expenses: monthlyExpenses || [],
      commitments,
      payments: commitmentPayments,
      scopeAccountId,
      now: new Date(),
      receivablesThisMonth,
      paydayType: profile?.payday_type,
      paydayDate: profile?.payday_date,
      includeSavings // <-- NEW
    })
  }, [
    accounts,
    monthlyExpenses,
    commitments,
    commitmentPayments,
    scopeAccountId,
    receivablesThisMonth,
    profile?.payday_type,
    profile?.payday_date,
    includeSavings // <-- NEW
  ])

  const cashFlowData = useMemo(
    () => computeCashFlow({
      accounts,
      expenses: monthlyExpenses || [],
      scopeAccountId,
      paydayType: profile?.payday_type,
      paydayDate: profile?.payday_date
    }),
    [accounts, monthlyExpenses, scopeAccountId, profile?.payday_type, profile?.payday_date]
  )

  return { radarSchedule, radarStats, velocityStats, cashFlowData }
}