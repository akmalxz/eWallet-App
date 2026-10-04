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
  scopeAccountId = 'all'
}) {
  // Radar always shows the global view — its own scope selector lives on
  // the radar page and doesn't exist yet.
  const radarSchedule = useMemo(() => {
    return computeCommitmentSchedule({
      commitments,
      payments: commitmentPayments,
      accounts,
      scopeAccountId: 'all',
      now: new Date()
    })
  }, [commitments, commitmentPayments, accounts])

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
      now: new Date()
    })
  }, [accounts, monthlyExpenses, commitments, commitmentPayments, scopeAccountId])

  const cashFlowData = useMemo(
    () => computeCashFlow({
      accounts,
      expenses: monthlyExpenses || [],
      scopeAccountId
    }),
    [accounts, monthlyExpenses, scopeAccountId]
  )

  return { radarSchedule, radarStats, velocityStats, cashFlowData }
}