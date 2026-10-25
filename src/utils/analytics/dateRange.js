// src/utils/analytics/dateRange.js
import { toMYDate } from '../dateHelpers'

// Malaysia is UTC+8. This is the offset in milliseconds (8 hours).
const MY_TZ_OFFSET_MS = 8 * 60 * 60 * 1000

/**
 * Returns the exact start timestamp (in MY time) for a given period.
 * @param {number} months - Number of months to look back (e.g., 6 for 6M)
 * @param {Date} now - Current date
 */
export const periodStart = (months, now = new Date()) => {
  // Shift the current date to MY time
  const d = toMYDate(now)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth() // 0-indexed (0 = Jan, 9 = Oct)

  // Go back (months - 1) months from the current month
  // Example: In Oct, looking back 6 months means starting in May.
  const startUtc = Date.UTC(year, month - (months - 1), 1)
  
  // startUtc is midnight UTC. We subtract the 8-hour offset 
  // to get midnight MY time on the 1st of that month.
  return new Date(startUtc - MY_TZ_OFFSET_MS)
}