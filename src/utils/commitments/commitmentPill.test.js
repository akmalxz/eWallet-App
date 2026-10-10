// src/utils/commitments/commitmentPill.test.js
import { describe, it, expect } from 'vitest'
import { getPeriodPill } from './commitmentPill'

// MY-noon date at 4am UTC (noon MY). Month is 0-INDEXED to match
// Date.UTC — d(2026, 0, 15) is January 15, d(2026, 9, 15) is October 15.
// Matches the convention used by commitmentSchedule.test.js.
const d = (y, m, day) => new Date(Date.UTC(y, m, day, 4, 0, 0))

// Build a schedule period. Only the fields getPeriodPill reads.
const period = (dueDate, { daysOverdue = 0, daysUntil = 0 } = {}) => ({
  dueDate,
  daysOverdue,
  daysUntil
})

describe('getPeriodPill', () => {
  it('labels an overdue same-month period with just the day count', () => {
    // Due Oct 5, now Oct 8 — same month, no prefix.
    const p = period(d(2026, 9, 5), { daysOverdue: 3, daysUntil: 0 })
    const result = getPeriodPill(p, d(2026, 9, 8))
    expect(result.label).toBe('3d overdue')
    expect(result.color).toContain('text-danger-text')
  })

  it('prefixes the month when overdue from a different month', () => {
    // Due Sep 20, now Oct 8 — different month, prefix with "Sept".
    const p = period(d(2026, 8, 20), { daysOverdue: 18, daysUntil: 0 })
    const result = getPeriodPill(p, d(2026, 9, 8))
    expect(result.label).toContain('overdue')
    expect(result.label).toContain('Sept')
  })

  it('labels due-today periods', () => {
    // Due Oct 8, now Oct 8.
    const p = period(d(2026, 9, 8), { daysOverdue: 0, daysUntil: 0 })
    const result = getPeriodPill(p, d(2026, 9, 8))
    expect(result.label).toBe('Due today')
    expect(result.color).toContain('text-danger-text')
  })

  it('labels periods due in 1-3 days with warning color', () => {
    // Due Oct 10, now Oct 8.
    const p = period(d(2026, 9, 10), { daysOverdue: 0, daysUntil: 2 })
    const result = getPeriodPill(p, d(2026, 9, 8))
    expect(result.label).toBe('In 2d')
    expect(result.color).toContain('text-warning-text')
  })

  it('labels periods due in 4-7 days with info color', () => {
    // Due Oct 14, now Oct 8.
    const p = period(d(2026, 9, 14), { daysOverdue: 0, daysUntil: 6 })
    const result = getPeriodPill(p, d(2026, 9, 8))
    expect(result.label).toBe('In 6d')
    expect(result.color).toContain('text-info-text')
  })

  it('labels periods due later this month with the day and month', () => {
    // Due Oct 25, now Oct 8 — same month, more than 7 days out.
    const p = period(d(2026, 9, 25), { daysOverdue: 0, daysUntil: 17 })
    const result = getPeriodPill(p, d(2026, 9, 8))
    expect(result.label).toBe('Due 25 Oct')
    expect(result.color).toContain('text-fg-muted')
  })

  it('labels periods due next month with the correct month name', () => {
    // Due Nov 5, now Oct 8 — different month, future.
    const p = period(d(2026, 10, 5), { daysOverdue: 0, daysUntil: 28 })
    const result = getPeriodPill(p, d(2026, 9, 8))
    expect(result.label).toBe('Due 5 Nov')
  })

  it('clamps day count on the 1-day boundary', () => {
    // Due Oct 9, now Oct 8.
    const p = period(d(2026, 9, 9), { daysOverdue: 0, daysUntil: 1 })
    const result = getPeriodPill(p, d(2026, 9, 8))
    expect(result.label).toBe('In 1d')
  })
})