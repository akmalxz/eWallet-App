// src/utils/analytics/burnRateEngine.test.js
import { describe, it, expect } from 'vitest'
import {
  computeBurnRate,
  isCommitmentPayment,
  isRealExpense
} from './burnRateEngine'
import { computeCommitmentSchedule } from '../commitments/commitmentSchedule'
import {
  nextPayday,
  lastWorkingDayOfMonth,
  getDayOfMonthMY
} from '../dateHelpers'

// Helper: build a MY-local date from components
const d = (year, monthIdx, day) => new Date(Date.UTC(year, monthIdx, day, 4, 0, 0))

// Shared fixture accounts
const ACC_A = { id: 'acc-a', account_name: 'Maybank', balance: 1000, is_archived: false }
const ACC_B = { id: 'acc-b', account_name: 'TNG',     balance: 200,  is_archived: false }
const ACC_ARCHIVED = { id: 'acc-x', account_name: 'Old', balance: 500, is_archived: true }

const everydayTx = (amount, date, account = 'acc-a', overrides = {}) => ({
  id: `tx-${Math.random()}`,
  amount,
  source_account_id: account,
  destination_account_id: null,
  category: 'Food & Beverages',
  transaction_date: date.toISOString(),
  needs_review: false,
  metadata: {},
  ...overrides
})

const billTx = (amount, date, account = 'acc-a') =>
  everydayTx(amount, date, account, {
    category: 'Commitments',
    metadata: { commitment_id: 'some-id' }
  })

// 5th arg `overrides` lets individual tests pin `created_at` so the
// 3-month carry-over window doesn't inflate their arithmetic.
const commitment = (amount, dueDay, account = 'acc-a', lastPaid = null, overrides = {}) => ({
  id: `c-${Math.random().toString(36).slice(2, 8)}`,
  name: 'Bill',
  amount,
  due_day_of_month: dueDay,
  account_id: account,
  is_active: true,
  created_at: new Date(Date.UTC(2025, 0, 1)).toISOString(),
  last_paid: lastPaid,
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

// ---------------------------------------------------------------------------
// Phase 1 — Payday
// ---------------------------------------------------------------------------
describe('Payday helpers', () => {
  it('returns the last Friday when the month ends on Saturday', () => {
    const payday = lastWorkingDayOfMonth(d(2026, 9, 15))
    expect(getDayOfMonthMY(payday)).toBe(30)
  })

  it('returns the last Friday when the month ends on Sunday', () => {
    const payday = lastWorkingDayOfMonth(d(2026, 4, 15))
    expect(getDayOfMonthMY(payday)).toBe(29)
  })

  it('returns the last weekday when the month ends on a weekday', () => {
    const payday = lastWorkingDayOfMonth(d(2026, 10, 15))
    expect(getDayOfMonthMY(payday)).toBe(30)
  })

  it('rolls over to next month after payday has passed', () => {
    const fromDec = nextPayday(d(2026, 11, 31))
    const fromJan = nextPayday(d(2027, 0, 1))
    expect(toMYMonth(fromDec)).toBe(11)
    expect(toMYMonth(fromJan)).toBe(0)
  })
})

const toMYMonth = (input) => {
  const shifted = new Date(input.getTime() + 8 * 60 * 60 * 1000)
  return shifted.getUTCMonth()
}

// ---------------------------------------------------------------------------
// Phase 2 — Classification
// ---------------------------------------------------------------------------
describe('Classification', () => {
  it('detects commitment payments by metadata', () => {
    const tx = everydayTx(50, d(2026, 9, 5), 'acc-a', {
      category: 'Misc',
      metadata: { commitment_id: 'abc' }
    })
    expect(isCommitmentPayment(tx)).toBe(true)
  })

  it('detects commitment payments by category', () => {
    const tx = everydayTx(50, d(2026, 9, 5), 'acc-a', { category: 'Commitments' })
    expect(isCommitmentPayment(tx)).toBe(true)
  })

  it('treats normal spending as everyday', () => {
    const tx = everydayTx(50, d(2026, 9, 5), 'acc-a', { category: 'Food' })
    expect(isCommitmentPayment(tx)).toBe(false)
  })

  it('rejects transfers as expenses', () => {
    const tx = { source_account_id: 'a', destination_account_id: 'b', amount: 100 }
    expect(isRealExpense(tx)).toBe(false)
  })

  it('rejects zero or negative amounts', () => {
    expect(isRealExpense({ source_account_id: 'a', amount: 0 })).toBe(false)
    expect(isRealExpense({ source_account_id: 'a', amount: -5 })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Phase 5 — Core scenarios
// ---------------------------------------------------------------------------
describe('computeBurnRate', () => {
  // Pin the creation to the first of the current month so the 3-month
  // carry-over window produces exactly one bill period in each test.
  const THIS_MONTH_START = d(2026, 9, 1).toISOString()

  it('handles no data — empty expenses and no commitments', () => {
    const result = computeBurnRate({
      accounts: [ACC_A],
      expenses: [],
      commitments: [],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    expect(result.status).toBe('no_data')
    expect(result.balance).toBe(1000)
    expect(result.freeMoney).toBe(1000)
    expect(result.dailyAverage).toBe(0)
  })

  it('handles no spending but with bills — still no_data', () => {
    const result = computeBurnRate({
      accounts: [ACC_A],
      expenses: [],
      commitments: [
        commitment(100, 20, 'acc-a', null, { created_at: THIS_MONTH_START })
      ],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    expect(result.status).toBe('no_data')
    expect(result.billsBeforePayday).toBe(100)
    expect(result.freeMoney).toBe(900)
  })

  it('subtracts unpaid bills before payday', () => {
    const now = d(2026, 9, 15)
    const result = computeBurnRate({
      accounts: [ACC_A],
      expenses: [everydayTx(300, now)],
      commitments: [
        commitment(100, 20, 'acc-a', null, { created_at: THIS_MONTH_START }),
        commitment(50, 5, 'acc-a', null, { created_at: THIS_MONTH_START })
      ],
      scopeAccountId: 'all',
      now
    })
    expect(result.billsBeforePayday).toBe(150)
    expect(result.freeMoney).toBe(850)
    expect(result.billCount).toBe(2)
  })

  it('excludes a bill due after payday', () => {
    const now = d(2026, 9, 15)
    const result = computeBurnRate({
      accounts: [ACC_A],
      expenses: [everydayTx(100, now)],
      commitments: [
        commitment(50, 31, 'acc-a', null, { created_at: THIS_MONTH_START })
      ],
      scopeAccountId: 'all',
      now
    })
    // Oct 31 > Oct 30 payday → excluded.
    expect(result.billsBeforePayday).toBe(0)
  })

  it('includes a bill due on payday', () => {
    const now = d(2026, 9, 15)
    const result = computeBurnRate({
      accounts: [ACC_A],
      expenses: [everydayTx(100, now)],
      commitments: [
        commitment(50, 30, 'acc-a', null, { created_at: THIS_MONTH_START })
      ],
      scopeAccountId: 'all',
      now
    })
    // Oct 30 == payday → included.
    expect(result.billsBeforePayday).toBe(50)
  })

  it('excludes a bill already paid this month', () => {
    const now = d(2026, 9, 15)
    const c1 = commitment(50, 20, 'acc-a', null, { created_at: THIS_MONTH_START })
    const result = computeBurnRate({
      accounts: [ACC_A],
      expenses: [everydayTx(100, now)],
      commitments: [c1],
      payments: [paid(c1.id, 2026, 10)],
      scopeAccountId: 'all',
      now
    })
    expect(result.billsBeforePayday).toBe(0)
  })

  it('clamps a bill due on the 31st in February', () => {
    // Feb 2025 — Feb 28 2025 is a Friday, so payday is Feb 28. A bill due on
    // day 31 clamps to Feb 28, which lands exactly on payday and is included.
    const now = d(2025, 1, 15)  // Feb 15 2025
    const result = computeBurnRate({
      accounts: [ACC_A],
      expenses: [everydayTx(100, now)],
      commitments: [
        commitment(50, 31, 'acc-a', null, {
          created_at: d(2025, 1, 1).toISOString()
        })
      ],
      scopeAccountId: 'all',
      now
    })
    expect(result.billsBeforePayday).toBe(50)
  })

  it('flags bills_exceed_balance when freeMoney is negative', () => {
    const now = d(2026, 9, 15)
    const result = computeBurnRate({
      accounts: [{ ...ACC_A, balance: 50 }],
      expenses: [everydayTx(100, now)],
      commitments: [
        commitment(200, 20, 'acc-a', null, { created_at: THIS_MONTH_START })
      ],
      scopeAccountId: 'all',
      now
    })
    expect(result.status).toBe('bills_exceed_balance')
    expect(result.shortfall).toBe(150)
    expect(result.freeMoney).toBe(-150)
  })

  it('flags on_track when runway exceeds days to payday', () => {
    const now = d(2026, 9, 15)
    const result = computeBurnRate({
      accounts: [ACC_A],
      expenses: [everydayTx(100, now)],
      commitments: [commitment(100, 20)],
      scopeAccountId: 'all',
      now
    })
    expect(result.status).toBe('on_track')
    expect(result.runsOutBeforePayday).toBe(false)
  })

  it('flags at_risk when runway is shorter than days to payday', () => {
    const now = d(2026, 9, 15)
    const expenses = Array.from({ length: 15 }, (_, i) =>
      everydayTx(100, d(2026, 9, i + 1))
    )
    const result = computeBurnRate({
      accounts: [ACC_A],
      expenses,
      commitments: [],
      scopeAccountId: 'all',
      now
    })
    expect(result.status).toBe('at_risk')
    expect(result.runsOutBeforePayday).toBe(true)
    expect(result.runwayDays).toBe(10)
  })

  it('excludes transfers and commitment payments from everyday', () => {
    const now = d(2026, 9, 15)
    const result = computeBurnRate({
      accounts: [ACC_A],
      expenses: [
        everydayTx(100, now),
        billTx(500, now),
        { ...everydayTx(200, now), destination_account_id: 'acc-b' },
        { ...everydayTx(0, now) }
      ],
      commitments: [],
      scopeAccountId: 'all',
      now
    })
    expect(result.everydaySpentThisMonth).toBe(100)
  })

  it('excludes archived accounts from "All" scope', () => {
    const now = d(2026, 9, 15)
    const result = computeBurnRate({
      accounts: [ACC_A, ACC_ARCHIVED],
      expenses: [everydayTx(100, now, 'acc-a'), everydayTx(999, now, 'acc-x')],
      commitments: [],
      scopeAccountId: 'all',
      now
    })
    expect(result.balance).toBe(1000)
    expect(result.everydaySpentThisMonth).toBe(100)
  })

  it('scopes to a single account correctly', () => {
    const now = d(2026, 9, 15)
    const result = computeBurnRate({
      accounts: [ACC_A, ACC_B],
      expenses: [everydayTx(100, now, 'acc-a'), everydayTx(50, now, 'acc-b')],
      commitments: [],
      scopeAccountId: 'acc-b',
      now
    })
    expect(result.balance).toBe(200)
    expect(result.everydaySpentThisMonth).toBe(50)
    expect(result.scopeLabel).toBe('TNG')
  })

  it('does not flag at_risk when runway equals daysToPayday exactly', () => {
    const expenses = Array.from({ length: 15 }, (_, i) =>
      everydayTx(1000 / 15, d(2026, 9, i + 1))
    )
    const result = computeBurnRate({
      accounts: [ACC_A],
      expenses,
      commitments: [],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    expect(result.runsOutBeforePayday).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// P3 consistency — schedule total must match engine's billsBeforePayday
// ---------------------------------------------------------------------------
describe('P3 consistency', () => {
  it('radar total and burn rate bills match for identical data', () => {
    const now = d(2026, 9, 15)
    const payday = new Date(Date.UTC(2026, 9, 30) - (8 * 60 * 60 * 1000))  // Oct 30

    const commitments = [
      commitment(100, 20),
      commitment(50, 5),
      commitment(75, 31)
    ]

    const accounts = [{ ...ACC_A, balance: 1000 }]

    const engine = computeBurnRate({
      accounts,
      expenses: [everydayTx(100, now)],
      commitments,
      payments: [],
      scopeAccountId: 'all',
      now
    })

    const schedule = computeCommitmentSchedule({
      commitments,
      payments: [],
      accounts,
      scopeAccountId: 'all',
      now,
      horizon: payday
    })

    expect(engine.billsBeforePayday).toBe(schedule.total)
  })

  it('both match when some bills are paid', () => {
    const now = d(2026, 9, 15)
    const payday = new Date(Date.UTC(2026, 9, 30) - (8 * 60 * 60 * 1000))

    const commitments = [commitment(100, 20), commitment(50, 25)]

    const payments = [
      paid(commitments[0].id, 2026, 10)  // Oct payment for c1
    ]

    const accounts = [{ ...ACC_A, balance: 1000 }]

    const engine = computeBurnRate({
      accounts,
      expenses: [everydayTx(100, now)],
      commitments,
      payments,
      scopeAccountId: 'all',
      now
    })

    const schedule = computeCommitmentSchedule({
      commitments,
      payments,
      accounts,
      scopeAccountId: 'all',
      now,
      horizon: payday
    })

    expect(engine.billsBeforePayday).toBe(schedule.total)
  })
})