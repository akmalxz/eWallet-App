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
  profile
}) {
  // Radar now uses the pay cycle to determine its horizon
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
    const currentBalance = accounts
      .filter((a) => !a.is_archived)
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
  }, [accounts, radarSchedule])

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
      paydayDate: profile?.payday_date
    })
  }, [
    accounts,
    monthlyExpenses,
    commitments,
    commitmentPayments,
    scopeAccountId,
    receivablesThisMonth,
    profile?.payday_type,
    profile?.payday_date
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