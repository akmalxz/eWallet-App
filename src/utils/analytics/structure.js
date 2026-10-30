// src/utils/analytics/structure.js
import { toMYDate, getPayCycle } from '../dateHelpers'

export const computeStructure = (
  income, 
  allExpenses, 
  everydayExpenses, 
  now = new Date(),
  paydayType = 'last_working_day',
  paydayDate = null
) => {
  // Get the exact start date of the current pay cycle.
  // We only want to count finished cycles, so we exclude anything after this date.
  const { startDate } = getPayCycle(now, paydayType, paydayDate)
  
  const sum = (list) =>
    list
      .filter((tx) => toMYDate(tx.transaction_date) < startDate)
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