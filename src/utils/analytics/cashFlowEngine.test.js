// src/utils/analytics/cashFlowEngine.test.js
import { describe, it, expect } from 'vitest'
import { computeCashFlow } from './cashFlowEngine'

// MY noon on the given calendar day.
const d = (y, m, day) => new Date(Date.UTC(y, m, day, 4, 0, 0))

const ACC_A = { id: 'acc-a', account_name: 'Maybank', is_archived: false }
const ACC_B = { id: 'acc-b', account_name: 'TNG',     is_archived: false }
const ACC_ARCHIVED = { id: 'acc-x', account_name: 'Old', is_archived: true }

const tx = (amount, date, account = 'acc-a', overrides = {}) => ({
  id: `tx-${Math.random().toString(36).slice(2, 8)}`,
  amount,
  source_account_id: account,
  category: 'Food & Beverages',
  transaction_date: date.toISOString(),
  needs_review: false,
  ...overrides
})

describe('computeCashFlow', () => {
  it('returns an empty array when there are no expenses', () => {
    const result = computeCashFlow({
      accounts: [ACC_A],
      expenses: [],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    expect(result).toEqual([])
  })

  it('returns an empty array when there are only last-month transactions', () => {
    const result = computeCashFlow({
      accounts: [ACC_A],
      expenses: [tx(100, d(2026, 8, 10), 'acc-a')],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    expect(result).toEqual([])
  })

  it('aggregates a single category and marks it as new', () => {
    const result = computeCashFlow({
      accounts: [ACC_A],
      expenses: [
        tx(50, d(2026, 9, 5), 'acc-a'),
        tx(30, d(2026, 9, 10), 'acc-a')
      ],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Food & Beverages')
    expect(result[0].value).toBe(80)
    expect(result[0].comparison).toEqual({ diff: 80, pct: null, isNew: true })
  })

  it('sorts categories by current-month value descending', () => {
    const result = computeCashFlow({
      accounts: [ACC_A],
      expenses: [
        tx(50, d(2026, 9, 5), 'acc-a', { category: 'Food & Beverages' }),
        tx(100, d(2026, 9, 6), 'acc-a', { category: 'Transport' }),
        tx(75, d(2026, 9, 7), 'acc-a', { category: 'Shopping' })
      ],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    expect(result.map(r => r.name)).toEqual(['Transport', 'Shopping', 'Food & Beverages'])
  })

  it('compares against the same day-range of last month', () => {
    const result = computeCashFlow({
      accounts: [ACC_A],
      expenses: [
        tx(100, d(2026, 8, 10), 'acc-a'),  // Sept 10 → within period (dayOfMonth = 15)
        tx(999, d(2026, 8, 20), 'acc-a'),  // Sept 20 → past dayOfMonth, excluded
        tx(150, d(2026, 9, 5), 'acc-a')    // Oct 5 → current
      ],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(150)
    expect(result[0].comparison).toEqual({ diff: 50, pct: 50, isNew: false })
  })

  it('rolls subcategories up to their main category', () => {
    const result = computeCashFlow({
      accounts: [ACC_A],
      expenses: [
        tx(60, d(2026, 9, 5), 'acc-a', { category: 'Food & Beverages > Lunch' }),
        tx(40, d(2026, 9, 6), 'acc-a', { category: 'Food & Beverages > Dinner' })
      ],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Food & Beverages')
    expect(result[0].value).toBe(100)
  })

  it('excludes transactions flagged needs_review', () => {
    const result = computeCashFlow({
      accounts: [ACC_A],
      expenses: [
        tx(100, d(2026, 9, 5), 'acc-a'),
        tx(999, d(2026, 9, 5), 'acc-a', { needs_review: true })
      ],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(100)
  })

  it('excludes zero and negative amounts', () => {
    const result = computeCashFlow({
      accounts: [ACC_A],
      expenses: [
        tx(100, d(2026, 9, 5), 'acc-a'),
        tx(0,   d(2026, 9, 5), 'acc-a'),
        tx(-50, d(2026, 9, 5), 'acc-a')
      ],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(100)
  })

  it('scopes to a single account when scopeAccountId is set', () => {
    const result = computeCashFlow({
      accounts: [ACC_A, ACC_B],
      expenses: [
        tx(100, d(2026, 9, 5), 'acc-a'),
        tx(999, d(2026, 9, 5), 'acc-b')
      ],
      scopeAccountId: 'acc-a',
      now: d(2026, 9, 15)
    })
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(100)
  })

  it('excludes archived accounts in "all" scope', () => {
    const result = computeCashFlow({
      accounts: [ACC_A, ACC_ARCHIVED],
      expenses: [
        tx(100, d(2026, 9, 5), 'acc-a'),
        tx(999, d(2026, 9, 5), 'acc-x')
      ],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(100)
  })

  it('excludes transactions from accounts missing from the accounts array', () => {
    const result = computeCashFlow({
      accounts: [ACC_A],
      expenses: [
        tx(100, d(2026, 9, 5), 'acc-a'),
        tx(999, d(2026, 9, 5), 'acc-b')   // acc-b not in accounts
      ],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(100)
  })

  it('rolls the tail into "Other" when there are more than 5 categories', () => {
    const mk = (cat, amt) => tx(amt, d(2026, 9, 5), 'acc-a', { category: cat })
    const result = computeCashFlow({
      accounts: [ACC_A],
      expenses: [
        mk('A', 100), mk('B', 90), mk('C', 80),
        mk('D', 70),  mk('E', 60), mk('F', 50)
      ],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    expect(result).toHaveLength(6)
    expect(result.map(r => r.name)).toEqual(['A', 'B', 'C', 'D', 'E', 'Other'])
    expect(result[5].value).toBe(50)
    expect(result[5].isOther).toBe(true)
  })

  it('filters categories below 3% out of the top 5', () => {
    const mk = (cat, amt) => tx(amt, d(2026, 9, 5), 'acc-a', { category: cat })
    const result = computeCashFlow({
      accounts: [ACC_A],
      expenses: [
        mk('A', 1000), mk('B', 1000), mk('C', 1000),
        mk('D', 1000), mk('E', 20), mk('F', 10)
      ],
      scopeAccountId: 'all',
      now: d(2026, 9, 15)
    })
    // Total 4030, 3% = 120.9. E (20) and F (10) fall out → both roll into Other.
    expect(result.map(r => r.name)).toEqual(['A', 'B', 'C', 'D', 'Other'])
    expect(result[4].value).toBe(30)
  })
})