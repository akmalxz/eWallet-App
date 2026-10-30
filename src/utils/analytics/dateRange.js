// src/utils/analytics/dateRange.js
import { getPayCycle, lastNCycles } from '../dateHelpers'

const MY_TZ_OFFSET_MS = 8 * 60 * 60 * 1000

const formatMYRangeDate = (date) => {
  const shifted = new Date(date.getTime() + MY_TZ_OFFSET_MS)
  return shifted.toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

/**
 * Returns a cycle-aligned date range for the last N completed pay cycles,
 * excluding the current (incomplete) cycle.
 *
 * Contract:
 *   - `start` is INCLUSIVE.
 *   - `end`   is EXCLUSIVE (start of the current cycle).
 *   - Filter with: txDate >= start && txDate < end.
 */
export const periodRange = (
  count,
  now = new Date(),
  paydayType = 'last_working_day',
  paydayDate = null
) => {
  const { startDate: currentStart } = getPayCycle(now, paydayType, paydayDate)

  // Seed = last moment of the previous completed cycle; walks back `count` cycles.
  const seed = new Date(currentStart.getTime() - 86400000)
  const cycles = lastNCycles(count, seed, paydayType, paydayDate)

  if (!cycles || cycles.length === 0) {
    return { start: new Date(0), end: currentStart, cycles: [], label: '' }
  }

  const first = cycles[0]
  const last = cycles[cycles.length - 1]

  return {
    start: first.startDate,
    // Exclusive end = start of the current cycle. Not last.endDate + 86400000,
    // which would be one day too far now that endDate is end-of-day.
    end: currentStart,
    cycles,
    label: `${formatMYRangeDate(first.startDate)} – ${formatMYRangeDate(last.endDate)}`,
  }
}

/**
 * @deprecated Use `periodRange`. Kept as a lower-bound shim only.
 */
export const periodStart = (months, now = new Date()) => {
  const d = new Date(now.getTime() + MY_TZ_OFFSET_MS)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()
  const startUtc = Date.UTC(year, month - (months - 1), 1)
  return new Date(startUtc - MY_TZ_OFFSET_MS)
}