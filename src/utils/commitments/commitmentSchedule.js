// src/utils/commitments/commitmentSchedule.js
import {
  toMYDate,
  dayKey,
  dueDateForMonth,
  daysBetweenMY
} from '../dateHelpers'
import { isPeriodHandled } from './commitmentPayments'
import { resolveAccountScope } from '../accounts/accountScope'

// How many calendar months back to look for unpaid periods
const CARRY_OVER_MONTHS = 3

/**
 * computeCommitmentSchedule
 *
 * Returns every unpaid commitment period within a horizon, using the
 * payments table to skip paid/skipped periods.
 *
 * Carry-over rules (P2.6):
 *   - Start at the later of (commitment creation month, CARRY_OVER_MONTHS ago)
 *   - End at the horizon month
 *   - Skip periods whose due date is before the commitment was created.
 *     Compared against the actual creation DAY, not the start of its month.
 *
 * Scope rules (P3.2): uses `resolveAccountScope`, so the caller controls
 * which accounts count.
 */
export const computeCommitmentSchedule = ({
  commitments = [],
  payments = [],
  accounts = [],
  scopeAccountId = 'all',
  now = new Date(),
  horizon = null
}) => {
  const { accountIds } = resolveAccountScope(accounts, scopeAccountId)

  const nowMY = toMYDate(now)

  // Default horizon: last MY day of the current month
  const horizonFinal = horizon || new Date(
    Date.UTC(nowMY.getUTCFullYear(), nowMY.getUTCMonth() + 1, 0) - (8 * 60 * 60 * 1000)
  )
  const horizonKey = dayKey(horizonFinal)
  const horizonMY = toMYDate(horizonFinal)
  const horizonYear = horizonMY.getUTCFullYear()
  const horizonMonthIdx = horizonMY.getUTCMonth()

  // Oldest allowed period
  const oldestMY = new Date(Date.UTC(
    nowMY.getUTCFullYear(),
    nowMY.getUTCMonth() - CARRY_OVER_MONTHS,
    1
  ))
  const oldestYear = oldestMY.getUTCFullYear()
  const oldestMonthIdx = oldestMY.getUTCMonth()

  const unpaidPeriods = []
  const needsAttention = []

  for (const comm of commitments) {
    if (!comm.is_active) continue

    // Account checks
    if (!comm.account_id) {
      needsAttention.push({ commitment: comm, reason: 'no_account' })
      continue
    }
    if (!accountIds.has(comm.account_id)) {
      const acc = accounts.find(a => a.id === comm.account_id)
      needsAttention.push({
        commitment: comm,
        reason: acc?.is_archived ? 'archived' : 'out_of_scope'
      })
      continue
    }

    // Creation month + day (Malaysia local)
    const createdMY = comm.created_at ? toMYDate(new Date(comm.created_at)) : null
    const createdYear = createdMY ? createdMY.getUTCFullYear() : null
    const createdMonthIdx = createdMY ? createdMY.getUTCMonth() : null
    // P2.6 — compare against the actual creation DAY. Let `dayKey` handle
    // the +08:00 shift from the raw timestamp, so we never double-shift.
    const creationKey = comm.created_at ? dayKey(new Date(comm.created_at)) : null

    // Cursor: later of creation month and oldest allowed month
    let cy, cm
    if (createdMY) {
      const createdIsAfterOldest =
        createdYear > oldestYear ||
        (createdYear === oldestYear && createdMonthIdx >= oldestMonthIdx)
      if (createdIsAfterOldest) {
        cy = createdYear
        cm = createdMonthIdx
      } else {
        cy = oldestYear
        cm = oldestMonthIdx
      }
    } else {
      cy = oldestYear
      cm = oldestMonthIdx
    }

    // Creation is past the horizon → skip
    if (cy > horizonYear || (cy === horizonYear && cm > horizonMonthIdx)) {
      continue
    }

    while (cy < horizonYear || (cy === horizonYear && cm <= horizonMonthIdx)) {
      const dueDate = dueDateForMonth(comm.due_day_of_month, cy, cm)
      const dueKey = dayKey(dueDate)

      const skipDueToBeforeCreation = creationKey && dueKey < creationKey
      const skipDueToAfterHorizon = dueKey > horizonKey
      const skipDueToHandled = isPeriodHandled(payments, comm.id, cy, cm + 1)

      if (!skipDueToBeforeCreation && !skipDueToAfterHorizon && !skipDueToHandled) {
        const diffDays = daysBetweenMY(now, dueDate)   // positive → future
        const daysOverdue = diffDays < 0 ? -diffDays : 0
        const daysUntil = diffDays > 0 ? diffDays : 0

        unpaidPeriods.push({
          commitmentId: comm.id,
          commitment: comm,
          periodYear: cy,
          periodMonth: cm + 1,
          dueDate,
          daysOverdue,
          daysUntil,
          amount: Number(comm.amount) || 0,
          accountId: comm.account_id,
          accountShort: false
        })
      }

      cm++
      if (cm > 11) { cm = 0; cy++ }
    }
  }

  // Sort: most overdue first, then soonest, then largest
  unpaidPeriods.sort((a, b) => {
    if (a.daysOverdue !== b.daysOverdue) return b.daysOverdue - a.daysOverdue
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil
    return b.amount - a.amount
  })

  const total = unpaidPeriods.reduce((s, p) => s + p.amount, 0)

  // ----- Cumulative per-account shortfall (P3.5) -----
  const byAccount = new Map()
  for (const p of unpaidPeriods) {
    if (!byAccount.has(p.accountId)) byAccount.set(p.accountId, [])
    byAccount.get(p.accountId).push(p)
  }

  const accountShortfalls = []

  for (const [accountId, periods] of byAccount.entries()) {
    const account = accounts.find(a => a.id === accountId)
    if (!account) continue

    // Sort ascending by due date
    const ordered = [...periods].sort((a, b) => a.dueDate - b.dueDate)

    let running = 0
    let firstShortIdx = -1

    for (let i = 0; i < ordered.length; i++) {
      running += ordered[i].amount
      if (firstShortIdx === -1 && running > (Number(account.balance) || 0)) {
        firstShortIdx = i
      }
      if (firstShortIdx !== -1) {
        ordered[i].accountShort = true
      }
    }

    if (firstShortIdx !== -1) {
      accountShortfalls.push({
        accountId,
        accountName: account.account_name,
        balance: Number(account.balance) || 0,
        totalRequired: running,
        shortfall: running - (Number(account.balance) || 0)
      })
    }
  }

  accountShortfalls.sort((a, b) => b.shortfall - a.shortfall)

  return { unpaidPeriods, total, needsAttention, accountShortfalls }
}