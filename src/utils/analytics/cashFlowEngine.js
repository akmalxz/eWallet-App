// src/utils/analytics/cashFlowEngine.js
import { toMYDate, getPayCycle } from '../dateHelpers'
import { rollUpToMain } from './categoryColors'
import { resolveAccountScope } from '../accounts/accountScope'

export const computeCashFlow = ({
  accounts = [],
  expenses = [],
  scopeAccountId = 'all',
  now = new Date(),
  paydayType = 'last_working_day',
  paydayDate = null
}) => {
  // 1. Get current cycle
  const { startDate: start, endDate: end } = getPayCycle(now, paydayType, paydayDate)
  
  // 2. Get previous cycle (for comparison)
  const prevCycleEndSeed = new Date(start.getTime() - 86400000)
  const { startDate: prevStart, endDate: prevEnd } = getPayCycle(prevCycleEndSeed, paydayType, paydayDate)

  const { accountIds } = resolveAccountScope(accounts, scopeAccountId)

  const thisByCat = {}
  const lastByCat = {}
  const txByCat = {}

  for (const tx of expenses) {
    if (!accountIds.has(tx.source_account_id)) continue
    if (tx.needs_review) continue
    const amt = Number(tx.amount) || 0
    if (amt <= 0) continue

    const txDate = toMYDate(tx.transaction_date).getTime()
    const cat = rollUpToMain(tx.category)

    if (txDate >= start.getTime() && txDate <= end.getTime()) {
      thisByCat[cat] = (thisByCat[cat] || 0) + amt
      if (!txByCat[cat]) txByCat[cat] = []
      txByCat[cat].push(tx)
    } else if (txDate >= prevStart.getTime() && txDate <= prevEnd.getTime()) {
      lastByCat[cat] = (lastByCat[cat] || 0) + amt
    }
  }

  const grandTotal = Object.values(thisByCat).reduce((s, v) => s + v, 0)
  if (grandTotal === 0) return []

  return Object.entries(thisByCat)
    .map(([name, value]) => {
      const last = lastByCat[name] || 0
      let comparison = null
      if (last > 0) {
        const diff = value - last
        comparison = { diff, pct: (diff / last) * 100, isNew: false }
      } else if (last === 0 && value > 0) {
        comparison = { diff: value, pct: null, isNew: true }
      }
      return { name, value, comparison, txns: txByCat[name] || [] }
    })
    .sort((a, b) => b.value - a.value)
}