// src/utils/receivables.js
import { monthKey } from './dateHelpers'

/**
 * Enrich a list of debt rows with their session's month key and a
 * boolean telling the caller whether that session belongs to the
 * current calendar month.
 *
 * Used by the burn-rate engine's receivables offset — debts from older
 * sessions shouldn't reduce this month's everyday spend.
 *
 * Pure — no Supabase, no side effects. Testable in isolation.
 *
 * @param {Array<{ id, amount, session_id }>} debts
 * @param {Array<{ id, created_at }>} sessions
 * @returns {Array<{ id, amount, sessionId, sessionMonth, isThisMonth }>}
 */
export const enrichReceivablesByMonth = (debts, sessions) => {
  const sessionMonth = new Map(
    (sessions || []).map(s => [s.id, monthKey(s.created_at)])
  )
  const thisMonthK = monthKey(new Date())

  return (debts || []).map(d => ({
    id: d.id,
    amount: Number(d.amount) || 0,
    sessionId: d.session_id,
    sessionMonth: sessionMonth.get(d.session_id) || null,
    isThisMonth: sessionMonth.get(d.session_id) === thisMonthK
  }))
}