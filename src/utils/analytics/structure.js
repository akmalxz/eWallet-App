// src/utils/analytics/structure.js

/**
 * Splits a pre-scoped, pre-classified set of transactions into
 * Bills / Everyday / Kept as percentages of income.
 *
 * IMPORTANT — contract:
 *   The caller is responsible for scoping `income`, `allExpenses`,
 *   and `everydayExpenses` to the target cycle range. `AnalyticsPage`
 *   does this by filtering to `[range.start, range.end)` before
 *   passing them in. Do NOT re-filter inside this function.
 *
 * @param {Array} income           Income transactions in the range.
 * @param {Array} allExpenses      All expense transactions in the range.
 * @param {Array} everydayExpenses Expense transactions minus commitment
 *                                 payments, in the same range.
 * @returns {{
 *   billsPct: number,
 *   everydayPct: number,
 *   keptPct: number,
 * } | null}
 */
export const computeStructure = (income, allExpenses, everydayExpenses) => {
  const sum = (list) =>
    (list || []).reduce((s, tx) => s + (Number(tx.amount) || 0), 0)

  const inc = sum(income)
  if (inc <= 0) return null

  const all = sum(allExpenses)
  const everyday = sum(everydayExpenses)

  // Bills are whatever's left after removing everyday spending.
  // This is safe because `everydayExpenses` is a strict subset of
  // `allExpenses` (commitment payments are stripped by useAnalyticsData).
  const bills = Math.max(0, all - everyday)

  return {
    billsPct: (bills / inc) * 100,
    everydayPct: (everyday / inc) * 100,
    keptPct: ((inc - all) / inc) * 100,
  }
}