// src/utils/analytics/cashFlowEngine.js
import { toMYDate, monthKey, getDayOfMonthMY } from '../dateHelpers'
import { rollUpToMain } from './categoryColors'
import { resolveAccountScope } from '../accounts/accountScope'

/**
 * Cash flow breakdown for the dashboard heatmap.
 *
 * Returns rows shaped for CashFlowHeatmap:
 *   { name, value, comparison, txns }
 * where `comparison` is null, or { diff, pct, isNew }.
 *
 * Color is intentionally NOT included — the caller assigns it from the
 * active theme palette so light/dark modes can differ.
 *
 * - Current-month spend per main category, sorted desc.
 * - `comparison` compares against the same day-range of last month.
 * - `txns` carries the underlying transactions for drill-down.
 */
export const computeCashFlow = ({
  accounts = [],
  expenses = [],
  scopeAccountId = 'all',
  now = new Date()
}) => {
  const dayOfMonth = getDayOfMonthMY(now)
  const nowMY = toMYDate(now)
  const thisKey = monthKey(nowMY)
  const lastMY = new Date(Date.UTC(nowMY.getUTCFullYear(), nowMY.getUTCMonth() - 1, 1))
  const lastKey = monthKey(lastMY)

  // Shared scope resolver — excludes archived accounts, same as burn rate
  // and the commitment radar.
  const { accountIds } = resolveAccountScope(accounts, scopeAccountId)

  const thisByCat = {}
  const lastByCat = {}
  const txByCat = {}

  for (const tx of expenses) {
    if (!accountIds.has(tx.source_account_id)) continue
    if (tx.needs_review) continue
    const amt = Number(tx.amount) || 0
    if (amt <= 0) continue

    const k = monthKey(tx.transaction_date)
    const cat = rollUpToMain(tx.category)

    if (k === thisKey) {
      thisByCat[cat] = (thisByCat[cat] || 0) + amt
      if (!txByCat[cat]) txByCat[cat] = []
      txByCat[cat].push(tx)
    } else if (k === lastKey) {
      const d = toMYDate(tx.transaction_date)
      if (d.getUTCDate() <= dayOfMonth) {
        lastByCat[cat] = (lastByCat[cat] || 0) + amt
      }
    }
  }

  const grandTotal = Object.values(thisByCat).reduce((s, v) => s + v, 0)
  if (grandTotal === 0) return []

  // Return ALL categories, sorted descending.
  const rows = Object.entries(thisByCat)
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

  return rows
}