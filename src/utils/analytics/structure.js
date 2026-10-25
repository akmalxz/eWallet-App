// src/utils/analytics/structure.js
import { monthKey } from '../dateHelpers'

export const computeStructure = (income, allExpenses, everydayExpenses, now = new Date()) => {
  const current = monthKey(now)
  
  const sum = (list) =>
    list
      .filter((tx) => monthKey(tx.transaction_date) !== current)
      .reduce((s, tx) => s + (Number(tx.amount) || 0), 0)

  const inc = sum(income)
  if (inc <= 0) return null
  
  const all = sum(allExpenses)
  const everyday = sum(everydayExpenses)
  
  // Bills are simply total expenses minus everyday expenses
  const bills = Math.max(0, all - everyday)

  return {
    billsPct: (bills / inc) * 100,
    everydayPct: (everyday / inc) * 100,
    keptPct: ((inc - all) / inc) * 100
  }
}