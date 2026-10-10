// src/utils/commitments/commitmentSchedule.test.js
import { describe, it, expect } from 'vitest'
import { computeCommitmentSchedule } from './commitmentSchedule'
import { toMYDate } from '../dateHelpers'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const d = (y, m, day) => new Date(Date.UTC(y, m, day, 4, 0, 0))

const ACC_A = {
  id: 'acc-a',
  account_name: 'Maybank',
  balance: 1000,
  is_archived: false
}

const ACC_B = {
  id: 'acc-b',
  account_name: 'TNG',
  balance: 200,
  is_archived: false
}

const ACC_ARCHIVED = {
  id: 'acc-x',
  account_name: 'Old Account',
  balance: 500,
  is_archived: true
}

const commitment = (id, amount, dueDay, account = 'acc-a', overrides = {}) => ({
  id,
  name: `Bill ${id}`,
  amount,
  due_day_of_month: dueDay,
  account_id: account,
  is_active: true,
  // Default creation far in the past so the 3-month carry-over window applies
  created_at: d(2025, 0, 1).toISOString(),
  ...overrides
})

const paid = (commitmentId, year, month) => ({
  id: `p-${commitmentId}-${year}-${month}`,
  commitment_id: commitmentId,
  period_year: year,
  period_month: month,
  status: 'paid',
  transaction_id: 'tx-1',
  created_at: new Date().toISOString()
})

const skipped = (commitmentId, year, month) => ({
  id: `s-${commitmentId}-${year}-${month}`,
  commitment_id: commitmentId,
  period_year: year,
  period_month: month,
  status: 'skipped',
  transaction_id: null,
  created_at: new Date().toISOString()
})

// Pay the 3 months preceding the horizon for a given commitment so the
// current month is the only unpaid period. Keeps the "shortfall" tests
// readable under the 3-month carry-over rule.
const payHistory = (commitmentId, nowYear, nowMonth) => {
  const out = []
  for (let i = 1; i <= 3; i++) {
    let m = nowMonth - i
    let y = nowYear
    if (m <= 0) { m += 12; y -= 1 }
    out.push(paid(commitmentId, y, m))
  }
  return out
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('computeCommitmentSchedule', () => {
  it('returns empty when there are no commitments', () => {
    const result = computeCommitmentSchedule({
      commitments: [],
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),
      horizon: d(2026, 9, 30)
    })
    expect(result.total).toBe(0)
    expect(result.unpaidPeriods).toHaveLength(0)
    expect(result.needsAttention).toHaveLength(0)
    expect(result.accountShortfalls).toHaveLength(0)
  })

  // --- 3-month carry-over: Jul, Aug, Sep, Oct ---

  it('carries over the previous 3 months plus the horizon month', () => {
    const result = computeCommitmentSchedule({
      commitments: [commitment('c1', 100, 25)],
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),    // Oct 15 MY
      horizon: d(2026, 9, 30) // Oct 30 MY
    })
    // Jul 25, Aug 25, Sep 25 (overdue) + Oct 25 (upcoming)
    expect(result.unpaidPeriods).toHaveLength(4)
    expect(result.total).toBe(400)

    const months = result.unpaidPeriods.map(p => p.periodMonth).sort((a, b) => a - b)
    expect(months).toEqual([7, 8, 9, 10])

    const oct = result.unpaidPeriods.find(p => p.periodMonth === 10)
    expect(oct.periodYear).toBe(2026)
    expect(oct.daysUntil).toBe(10)
    expect(oct.daysOverdue).toBe(0)
  })

  it('includes an overdue period from last month alongside an upcoming one', () => {
    const result = computeCommitmentSchedule({
      commitments: [commitment('c1', 100, 15)],
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 5),     // Oct 5 MY
      horizon: d(2026, 9, 31)
    })
    expect(result.unpaidPeriods).toHaveLength(4)

    const sep = result.unpaidPeriods.find(p => p.periodMonth === 9)
    const oct = result.unpaidPeriods.find(p => p.periodMonth === 10)

    expect(sep).toBeDefined()
    expect(sep.daysOverdue).toBe(20)   // Sep 15 → Oct 5
    expect(sep.daysUntil).toBe(0)

    expect(oct).toBeDefined()
    expect(oct.daysOverdue).toBe(0)
    expect(oct.daysUntil).toBe(10)
  })

  it('excludes paid periods', () => {
    const result = computeCommitmentSchedule({
      commitments: [commitment('c1', 100, 15)],
      payments: [paid('c1', 2026, 9)],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 5),
      horizon: d(2026, 9, 31)
    })
    // Sep excluded → Jul, Aug, Oct
    expect(result.unpaidPeriods).toHaveLength(3)
    expect(result.unpaidPeriods.find(p => p.periodMonth === 9)).toBeUndefined()
    expect(result.total).toBe(300)
  })

  it('excludes skipped periods', () => {
    const result = computeCommitmentSchedule({
      commitments: [commitment('c1', 100, 15)],
      payments: [skipped('c1', 2026, 9)],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 5),
      horizon: d(2026, 9, 31)
    })
    expect(result.unpaidPeriods).toHaveLength(3)
    expect(result.unpaidPeriods.find(p => p.periodMonth === 9)).toBeUndefined()
  })

  it('clamps a bill due on the 31st in February', () => {
    const result = computeCommitmentSchedule({
      commitments: [commitment('c1', 100, 31)],
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 1, 15),     // Feb 15 MY
      horizon: d(2026, 1, 28)  // Feb 28 MY
    })
    // Nov 30, Dec 31, Jan 31, Feb 28 — one period per month
    expect(result.unpaidPeriods).toHaveLength(4)
    const feb = result.unpaidPeriods.find(
      p => p.periodYear === 2026 && p.periodMonth === 2
    )
    expect(feb).toBeDefined()
    // Read the day through the MY shift — the raw Date is 16:00 UTC the day before.
    expect(toMYDate(feb.dueDate).getUTCDate()).toBe(28)
  })

  it('excludes archived accounts and flags them in needsAttention', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 100, 15, 'acc-a'),
        commitment('c2', 50, 15, 'acc-x')  // archived
      ],
      payments: [],
      accounts: [ACC_A, ACC_ARCHIVED],
      scopeAccountId: 'all',
      now: d(2026, 9, 5),
      horizon: d(2026, 9, 31)
    })
    // c1 contributes Jul–Oct = 400
    expect(result.total).toBe(400)
    expect(result.needsAttention).toHaveLength(1)
    expect(result.needsAttention[0].commitment.id).toBe('c2')
    expect(result.needsAttention[0].reason).toBe('archived')
  })

  it('flags bills with no account', () => {
    const result = computeCommitmentSchedule({
      commitments: [commitment('c1', 100, 15, null)],
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 5),
      horizon: d(2026, 9, 31)
    })
    expect(result.total).toBe(0)
    expect(result.needsAttention).toHaveLength(1)
    expect(result.needsAttention[0].reason).toBe('no_account')
  })

  it('scopes to a single account', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 100, 15, 'acc-a'),
        commitment('c2', 50, 15, 'acc-b')
      ],
      payments: [],
      accounts: [ACC_A, ACC_B],
      scopeAccountId: 'acc-a',
      now: d(2026, 9, 5),
      horizon: d(2026, 9, 31)
    })
    // c1 only: Jul–Oct = 400
    expect(result.unpaidPeriods).toHaveLength(4)
    expect(result.unpaidPeriods.every(p => p.accountId === 'acc-a')).toBe(true)
    expect(result.total).toBe(400)
  })

  it('flags a single account that is short for its own bills', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 300, 15, 'acc-a'),
        commitment('c2', 200, 20, 'acc-a')
      ],
      payments: [],
      accounts: [{ ...ACC_A, balance: 400 }],  // can't cover anything over time
      scopeAccountId: 'all',
      now: d(2026, 9, 5),
      horizon: d(2026, 9, 31)
    })
    expect(result.accountShortfalls).toHaveLength(1)
    const sf = result.accountShortfalls[0]
    expect(sf.accountName).toBe('Maybank')
    expect(sf.balance).toBe(400)
    expect(sf.totalRequired).toBeGreaterThan(400)
    expect(sf.shortfall).toBeGreaterThan(0)
  })

  it('flags only the second bill when the first fits but the second pushes over', () => {
    // Pay Jul–Sep for both bills so only the current month remains, isolating
    // the running-total logic.
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 200, 15, 'acc-a'),
        commitment('c2', 300, 20, 'acc-a')
      ],
      payments: [
        ...payHistory('c1', 2026, 10),
        ...payHistory('c2', 2026, 10)
      ],
      accounts: [{ ...ACC_A, balance: 400 }],
      scopeAccountId: 'all',
      now: d(2026, 9, 5),
      horizon: d(2026, 9, 31)
    })

    const c1Oct = result.unpaidPeriods.find(
      p => p.commitmentId === 'c1' && p.periodMonth === 10
    )
    const c2Oct = result.unpaidPeriods.find(
      p => p.commitmentId === 'c2' && p.periodMonth === 10
    )

    expect(c1Oct).toBeDefined()
    expect(c2Oct).toBeDefined()
    expect(c1Oct.accountShort).toBe(false)
    expect(c2Oct.accountShort).toBe(true)
    expect(result.accountShortfalls).toHaveLength(1)
  })

  it('does not flag a shortfall when the balance covers all bills', () => {
    const result = computeCommitmentSchedule({
      commitments: [commitment('c1', 100, 15)],
      payments: [],
      accounts: [{ ...ACC_A, balance: 500 }],
      scopeAccountId: 'all',
      now: d(2026, 9, 5),
      horizon: d(2026, 9, 31)
    })
    expect(result.accountShortfalls).toHaveLength(0)
    expect(result.unpaidPeriods.every(p => p.accountShort === false)).toBe(true)
  })

  it('ignores periods older than three months', () => {
    const result = computeCommitmentSchedule({
      commitments: [commitment('c1', 100, 15)],
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),
      horizon: d(2026, 9, 31)
    })
    const monthValues = result.unpaidPeriods.map(p => p.periodMonth)
    // Window is Jul → Oct; nothing earlier than July should appear.
    expect(monthValues.every(m => m >= 7)).toBe(true)
  })

  it('respects the commitment creation date', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 100, 15, 'acc-a', {
          created_at: d(2026, 9, 20).toISOString()   // Oct 20 MY
        })
      ],
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 25),      // Oct 25 MY
      horizon: d(2026, 9, 31)   // Oct 31 MY
    })
    // Oct 15 due date is before creation → excluded.
    // Nov 15 is after horizon → excluded.
    expect(result.unpaidPeriods).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it('includes a period due exactly on the horizon', () => {
    const result = computeCommitmentSchedule({
      commitments: [commitment('c1', 100, 31)],
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),
      horizon: d(2026, 9, 31)   // Oct 31 = horizon
    })
    // Jul 31, Aug 31, Sep 30 (clamped), Oct 31
    expect(result.unpaidPeriods).toHaveLength(4)
    const oct = result.unpaidPeriods.find(p => p.periodMonth === 10)
    expect(oct).toBeDefined()
    expect(toMYDate(oct.dueDate).getUTCDate()).toBe(31)
  })

  it('sorts by most overdue first', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 100, 20),   // Jul 20 → ~77 days overdue
        commitment('c2', 200, 10)    // Jul 10 → ~87 days overdue
      ],
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 5),
      horizon: d(2026, 9, 31)
    })
    const first = result.unpaidPeriods[0]
    expect(first.commitmentId).toBe('c2')
    expect(first.daysOverdue).toBeGreaterThanOrEqual(
      result.unpaidPeriods[1].daysOverdue
    )
  })

  it('two bills on one account that individually fit but together do not', () => {
    // Current-month only, to isolate the running total logic.
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 150, 15, 'acc-a'),
        commitment('c2', 200, 20, 'acc-a')
      ],
      payments: [
        ...payHistory('c1', 2026, 10),
        ...payHistory('c2', 2026, 10)
      ],
      accounts: [{ ...ACC_A, balance: 250 }],
      scopeAccountId: 'all',
      now: d(2026, 9, 5),
      horizon: d(2026, 9, 31)
    })
    // 150 fits (≤ 250); cumulative 350 does not.
    const inOct = result.unpaidPeriods.filter(p => p.periodMonth === 10)
    const first = inOct.find(p => p.commitmentId === 'c1')
    const second = inOct.find(p => p.commitmentId === 'c2')

    expect(first.accountShort).toBe(false)
    expect(second.accountShort).toBe(true)
    expect(result.accountShortfalls).toHaveLength(1)
  })

    // ---------------------------------------------------------------------
  // BNPL completion
  // ---------------------------------------------------------------------

  it('generates periods for an incomplete BNPL plan', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 250, 15, 'acc-a', {
          kind: 'bnpl',
          term_months: 12
        })
      ],
      // 3 of 12 paid → 9 more to generate
      payments: [
        paid('c1', 2026, 7),
        paid('c1', 2026, 8),
        paid('c1', 2026, 9)
      ],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),
      horizon: d(2026, 9, 31)
    })
    // Only Oct is unpaid within the carry-over window
    expect(result.unpaidPeriods.length).toBeGreaterThan(0)
    expect(result.unpaidPeriods.every(p => p.commitmentId === 'c1')).toBe(true)
  })

  it('generates no periods for a completed BNPL plan', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 250, 15, 'acc-a', {
          kind: 'bnpl',
          term_months: 3
        })
      ],
      payments: [
        paid('c1', 2026, 8),
        paid('c1', 2026, 9),
        paid('c1', 2026, 10)
      ],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),
      horizon: d(2026, 9, 31)
    })
    expect(result.unpaidPeriods).toHaveLength(0)
    expect(result.total).toBe(0)
    expect(result.needsAttention).toHaveLength(0)
    expect(result.accountShortfalls).toHaveLength(0)
  })

  it('treats an overpaid BNPL plan as complete', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 250, 15, 'acc-a', {
          kind: 'bnpl',
          term_months: 3
        })
      ],
      // 4 paid of 3 → defensive: still complete, no phantom periods
      payments: [
        paid('c1', 2026, 7),
        paid('c1', 2026, 8),
        paid('c1', 2026, 9),
        paid('c1', 2026, 10)
      ],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),
      horizon: d(2026, 9, 31)
    })
    expect(result.unpaidPeriods).toHaveLength(0)
  })

  it('does not count skipped rows toward BNPL completion', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 250, 15, 'acc-a', {
          kind: 'bnpl',
          term_months: 3
        })
      ],
      // 2 paid + 1 skipped = 2 completed, not 3
      payments: [
        paid('c1', 2026, 7),
        paid('c1', 2026, 8),
        skipped('c1', 2026, 9)
      ],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),
      horizon: d(2026, 9, 31)
    })
    // Still has unpaid periods (Oct)
    expect(result.unpaidPeriods.length).toBeGreaterThan(0)
  })

  it('a completed BNPL plan with an archived account is not flagged', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 250, 15, 'acc-x', {   // archived account
          kind: 'bnpl',
          term_months: 2
        })
      ],
      payments: [
        paid('c1', 2026, 9),
        paid('c1', 2026, 10)
      ],
      accounts: [ACC_A, ACC_ARCHIVED],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),
      horizon: d(2026, 9, 31)
    })
    expect(result.needsAttention).toHaveLength(0)
    expect(result.unpaidPeriods).toHaveLength(0)
  })

  it('treats commitments without a kind as recurring (backward compat)', () => {
    // No kind column on the object — engine should behave as before.
    const result = computeCommitmentSchedule({
      commitments: [commitment('c1', 100, 15)],   // no kind field
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 5),
      horizon: d(2026, 9, 31)
    })
    // Carries over Jul/Aug/Sep + Oct, same as the earlier recurring tests
    expect(result.unpaidPeriods).toHaveLength(4)
    expect(result.total).toBe(400)
  })

    // ---------------------------------------------------------------------
  // BNPL with first_payment_date
  // ---------------------------------------------------------------------

  it('BNPL: first_payment_date in the past generates its period (overdue)', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 100, 9, 'acc-a', {
          kind: 'bnpl',
          term_months: 12,
          first_payment_date: '2026-10-09'  // Oct 9, "today" is Oct 15
        })
      ],
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),
      horizon: d(2026, 9, 31)
    })

    // Oct 9 is 6 days overdue; Nov 9 is past the horizon.
    expect(result.unpaidPeriods).toHaveLength(1)
    const oct = result.unpaidPeriods[0]
    expect(oct.periodMonth).toBe(10)
    expect(oct.periodYear).toBe(2026)
    expect(oct.daysOverdue).toBe(6)
    expect(oct.daysUntil).toBe(0)
  })

  it('BNPL: first_payment_date in the future skips the current month', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 100, 9, 'acc-a', {
          kind: 'bnpl',
          term_months: 12,
          first_payment_date: '2026-11-09'  // Nov 9, after Oct 31 horizon
        })
      ],
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),
      horizon: d(2026, 9, 31)
    })

    expect(result.unpaidPeriods).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it('BNPL: multiple past periods generate with correct overdue days', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 100, 9, 'acc-a', {
          kind: 'bnpl',
          term_months: 12,
          first_payment_date: '2026-08-09'  // Aug 9 → 3 unpaid by Oct 15
        })
      ],
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),
      horizon: d(2026, 9, 31)
    })

    // Aug 9 (67d overdue), Sep 9 (36d), Oct 9 (6d)
    expect(result.unpaidPeriods).toHaveLength(3)
    const months = result.unpaidPeriods
      .map(p => p.periodMonth)
      .sort((a, b) => a - b)
    expect(months).toEqual([8, 9, 10])
  })

  it('BNPL: first_payment_date older than the carry-over window is clamped', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 100, 9, 'acc-a', {
          kind: 'bnpl',
          term_months: 24,
          first_payment_date: '2026-01-09'  // 9 months before Oct — clamped to Jul
        })
      ],
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),
      horizon: d(2026, 9, 31)
    })

    // Window is Jul–Oct. Even though first_payment_date is Jan,
    // only Jul, Aug, Sep, Oct are generated.
    expect(result.unpaidPeriods).toHaveLength(4)
    const months = result.unpaidPeriods
      .map(p => p.periodMonth)
      .sort((a, b) => a - b)
    expect(months).toEqual([7, 8, 9, 10])
  })

  it('BNPL: completed plan ignores first_payment_date entirely', () => {
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 100, 9, 'acc-a', {
          kind: 'bnpl',
          term_months: 3,
          first_payment_date: '2026-08-09'
        })
      ],
      payments: [
        paid('c1', 2026, 8),
        paid('c1', 2026, 9),
        paid('c1', 2026, 10)
      ],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),
      horizon: d(2026, 9, 31)
    })

    expect(result.unpaidPeriods).toHaveLength(0)
    expect(result.needsAttention).toHaveLength(0)
  })

  it('BNPL: due day is derived from first_payment_date, not due_day_of_month', () => {
    // Deliberately mismatched: due_day_of_month says 1, first_payment_date says 15.
    // The engine should honour first_payment_date.
    const result = computeCommitmentSchedule({
      commitments: [
        commitment('c1', 100, 1, 'acc-a', {   // due_day_of_month = 1
          kind: 'bnpl',
          term_months: 12,
          first_payment_date: '2026-10-15'    // day 15
        })
      ],
      payments: [],
      accounts: [ACC_A],
      scopeAccountId: 'all',
      now: d(2026, 9, 15),
      horizon: d(2026, 9, 31)
    })

    expect(result.unpaidPeriods).toHaveLength(1)
    // The period should be due Oct 15, not Oct 1.
    expect(toMYDate(result.unpaidPeriods[0].dueDate).getUTCDate()).toBe(15)
  })
})