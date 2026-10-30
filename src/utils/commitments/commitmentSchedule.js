// src/utils/commitments/commitmentSchedule.js
import {
  toMYDate,
  dayKey,
  dueDateForMonth,
  daysBetweenMY,
  getPayCycle
} from '../dateHelpers'
import { isPeriodHandled } from './commitmentPayments'
import { resolveAccountScope } from '../accounts/accountScope'

// How many calendar months back to look for unpaid periods
const CARRY_OVER_MONTHS = 3

/**
 * Parse a "YYYY-MM-DD" date-only string into { year, monthIdx, day }
 * without going through JS Date (which would apply the local timezone).
 */
const parseDateOnly = (dateStr) => {
  if (!dateStr) return null
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return { year: y, monthIdx: m - 1, day: d }
}

export const computeCommitmentSchedule = ({
  commitments = [],
  payments = [],
  accounts = [],
  scopeAccountId = 'all',
  now = new Date(),
  horizon = null,
  paydayType = 'last_working_day',
  paydayDate = null
}) => {
  const { accountIds } = resolveAccountScope(accounts, scopeAccountId)
  const nowMY = toMYDate(now)

  // If no horizon is passed (e.g., from Dashboard radar), use the end of the current pay cycle
  let horizonFinal = horizon
  if (!horizonFinal) {
    const { endDate } = getPayCycle(now, paydayType, paydayDate)
    // Add 1 day to include the full end date
    horizonFinal = new Date(endDate.getTime() + 86400000)
  }

  const horizonKey = dayKey(horizonFinal)
  const horizonMY = toMYDate(horizonFinal)
  const horizonYear = horizonMY.getUTCFullYear()
  const horizonMonthIdx = horizonMY.getUTCMonth()

  const oldestMY = new Date(Date.UTC(
    nowMY.getUTCFullYear(),
    nowMY.getUTCMonth() - CARRY_OVER_MONTHS,
    1
  ))
  const oldestYear = oldestMY.getUTCFullYear()
  const oldestMonthIdx = oldestMY.getUTCMonth()

  // Paid-only count, used by the BNPL completion check.
  const paidCountByCommitment = new Map()
  for (const p of payments) {
    if (p.status !== 'paid') continue
    paidCountByCommitment.set(
      p.commitment_id,
      (paidCountByCommitment.get(p.commitment_id) || 0) + 1
    )
  }

  const unpaidPeriods = []
  const needsAttention = []

  for (const comm of commitments) {
    if (!comm.is_active) continue

    const isBnpl = comm.kind === 'bnpl'

    // Completed BNPL plans are history — no periods, no attention flags.
    if (isBnpl && comm.term_months != null) {
      const paid = paidCountByCommitment.get(comm.id) || 0
      if (paid >= comm.term_months) continue
    }

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

    // --- Determine starting cursor + skip-floor key ---
    let cy, cm, startKey, dayForMonth

    if (isBnpl && comm.first_payment_date) {
      const fp = parseDateOnly(comm.first_payment_date)
      if (!fp) continue

      const fpIsAfterOldest =
        fp.year > oldestYear ||
        (fp.year === oldestYear && fp.monthIdx >= oldestMonthIdx)

      if (fpIsAfterOldest) {
        cy = fp.year
        cm = fp.monthIdx
      } else {
        cy = oldestYear
        cm = oldestMonthIdx
      }

      startKey = String(comm.first_payment_date).slice(0, 10)
      dayForMonth = fp.day
    } else {
      const createdMY = comm.created_at ? toMYDate(new Date(comm.created_at)) : null
      const createdYear = createdMY ? createdMY.getUTCFullYear() : null
      const createdMonthIdx = createdMY ? createdMY.getUTCMonth() : null
      startKey = comm.created_at ? dayKey(new Date(comm.created_at)) : null
      dayForMonth = comm.due_day_of_month

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
    }

    // Cursor is past the horizon → nothing to generate
    if (cy > horizonYear || (cy === horizonYear && cm > horizonMonthIdx)) {
      continue
    }

    // --- Walk months ---
    while (cy < horizonYear || (cy === horizonYear && cm <= horizonMonthIdx)) {
      const dueDate = dueDateForMonth(dayForMonth, cy, cm)
      const dueKey = dayKey(dueDate)

      const skipDueToBeforeStart = startKey && dueKey < startKey
      const skipDueToAfterHorizon = dueKey > horizonKey
      const skipDueToHandled = isPeriodHandled(payments, comm.id, cy, cm + 1)

      if (!skipDueToBeforeStart && !skipDueToAfterHorizon && !skipDueToHandled) {
        const diffDays = daysBetweenMY(now, dueDate)
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

  unpaidPeriods.sort((a, b) => {
    if (a.daysOverdue !== b.daysOverdue) return b.daysOverdue - a.daysOverdue
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil
    return b.amount - a.amount
  })

  const total = unpaidPeriods.reduce((s, p) => s + p.amount, 0)

  // ----- Cumulative per-account shortfall -----
  const byAccount = new Map()
  for (const p of unpaidPeriods) {
    if (!byAccount.has(p.accountId)) byAccount.set(p.accountId, [])
    byAccount.get(p.accountId).push(p)
  }

  const accountShortfalls = []

  for (const [accountId, periods] of byAccount.entries()) {
    const account = accounts.find(a => a.id === accountId)
    if (!account) continue

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