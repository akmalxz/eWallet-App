// src/utils/burnRateEngine.test.js
import { describe, it, expect } from 'vitest'
import {
  computeBurnRate,
  isCommitmentPayment,
  isRealExpense
} from './burnRateEngine'
import {
  nextPayday,
  lastWorkingDayOfMonth,
  getDayOfMonthMY
} from './dateHelpers'

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

const commitment = (amount, dueDay, account = 'acc-a', lastPaid = null) => ({
  id: `c-${Math.random()}`,
  name: 'Bill',
  amount,
  due_day_of_month: dueDay,
  account_id: account,
  is_active: true,
  last_paid: lastPaid
})

// ---------------------------------------------------------------------------
// Phase 1 — Payday
// ---------------------------------------------------------------------------
describe('Payday helpers', () => {
  it('returns the last Friday when the month ends on Saturday', () => {
    // Oct 2026: Oct 31 is Saturday → payday should be Fri Oct 30
    const payday = lastWorkingDayOfMonth(d(2026, 9, 15))
    expect(getDayOfMonthMY(payday)).toBe(30)
  })

  it('returns the last Friday when the month ends on Sunday', () => {
    // May 2026: May 31 is Sunday → payday should be Fri May 29
    const payday = lastWorkingDayOfMonth(d(2026, 4, 15))
    expect(getDayOfMonthMY(payday)).toBe(29)
  })

  it('returns the last weekday when the month ends on a weekday', () => {
    // Nov 2026: Nov 30 is Monday → payday should be Mon Nov 30
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

// Small helper so the rollover test reads clearly
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
      commitments: [commitment(100, 20)],
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
        commitment(100, 20),
        commitment(50, 5)
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
      commitments: [commitment(50, 31)],
      scopeAccountId: 'all',
      now
    })
    expect(result.billsBeforePayday).toBe(0)
  })

  it('includes a bill due on payday', () => {
    const now = d(2026, 9, 15)
    const result = computeBurnRate({
      accounts: [ACC_A],
      expenses: [everydayTx(100, now)],
      commitments: [commitment(50, 30)],
      scopeAccountId: 'all',
      now
    })
    expect(result.billsBeforePayday).toBe(50)
  })

  it('excludes a bill already paid this month', () => {
    const now = d(2026, 9, 15)
    const result = computeBurnRate({
      accounts: [ACC_A],
      expenses: [everydayTx(100, now)],
      commitments: [
        commitment(50, 20, 'acc-a', d(2026, 9, 20).toISOString())
      ],
      scopeAccountId: 'all',
      now
    })
    expect(result.billsBeforePayday).toBe(0)
  })

  it('clamps a bill due on the 31st in February', () => {
    const now = d(2026, 1, 15)
    const result = computeBurnRate({
      accounts: [ACC_A],
      expenses: [everydayTx(100, now)],
      commitments: [commitment(50, 31)],
      scopeAccountId: 'all',
      now
    })
    expect(result.billsBeforePayday).toBe(0)
  })

  it('flags bills_exceed_balance when freeMoney is negative', () => {
    const now = d(2026, 9, 15)
    const result = computeBurnRate({
      accounts: [{ ...ACC_A, balance: 50 }],
      expenses: [everydayTx(100, now)],
      commitments: [commitment(200, 20)],
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
    const now = d(2026, 9, 1)
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