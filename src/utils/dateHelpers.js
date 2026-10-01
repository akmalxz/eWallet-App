// src/utils/dateHelpers.js
export const MY_TZ_OFFSET_MS = 8 * 60 * 60 * 1000

// ===========================================================================
// Existing helpers
// ===========================================================================
export const toMYDate = (input) => {
  const d = input instanceof Date ? input : new Date(input)
  return new Date(d.getTime() + MY_TZ_OFFSET_MS)
}

export const startOfDayMY = (input) => {
  const d = toMYDate(input)
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - MY_TZ_OFFSET_MS
  )
}

export const startOfWeekMY = (input) => {
  const d = startOfDayMY(input)
  const dow = toMYDate(d).getUTCDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const shifted = toMYDate(d)
  shifted.setUTCDate(shifted.getUTCDate() + diff)
  return new Date(shifted.getTime() - MY_TZ_OFFSET_MS)
}

export const startOfMonthMY = (input) => {
  const d = toMYDate(input)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - MY_TZ_OFFSET_MS)
}

export const daysInMonth = (year, monthIdx) =>
  new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate()

export const monthKey = (input) => {
  const d = toMYDate(input)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export const dayKey = (input) => {
  const d = toMYDate(input)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export const monthLabel = (year, monthIdx) =>
  new Date(Date.UTC(year, monthIdx, 1)).toLocaleString('en-MY', {
    month: 'short',
    timeZone: 'UTC'
  })

export const lastNMonths = (count, now = new Date()) => {
  const d = toMYDate(now)
  const months = []
  for (let i = count - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1))
    const year = m.getUTCFullYear()
    const monthIdx = m.getUTCMonth()
    months.push({
      key: `${year}-${String(monthIdx + 1).padStart(2, '0')}`,
      year,
      monthIdx,
      label: monthLabel(year, monthIdx)
    })
  }
  return months
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const myWeekdayIndex = (input) => {
  const d = toMYDate(input)
  const js = d.getUTCDay()
  return js === 0 ? 6 : js - 1
}

export const getDaysInMonthMY = (input = new Date()) => {
  const d = toMYDate(input)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
}

export const getDayOfMonthMY = (input = new Date()) => {
  return toMYDate(input).getUTCDate()
}

export const getCommitmentTiming = (dueDay, now = new Date()) => {
  const nowMY = toMYDate(now)
  const year = nowMY.getUTCFullYear()
  const monthIdx = nowMY.getUTCMonth()
  const todayDate = nowMY.getUTCDate()
  const lastDay = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate()
  const effectiveDueDay = Math.min(dueDay, lastDay)

  if (effectiveDueDay === todayDate) {
    return { kind: 'today', days: 0, effectiveDueDay }
  }
  if (effectiveDueDay < todayDate) {
    return { kind: 'overdue', days: todayDate - effectiveDueDay, effectiveDueDay }
  }
  return { kind: 'upcoming', days: effectiveDueDay - todayDate, effectiveDueDay }
}

export const monthShortName = (now = new Date()) =>
  new Date().toLocaleString('en-MY', { month: 'short' })


// ===========================================================================
// PHASE 1 — Burn rate date helpers
// All take `now` as an input, so they're testable with fixed dates.
// ===========================================================================

/**
 * Is the given MY-local date a weekend (Sat or Sun)?
 */
const isWeekendMY = (d) => {
  const dow = toMYDate(d).getUTCDay() // 0=Sun, 6=Sat
  return dow === 0 || dow === 6
}

/**
 * Last working day of the month containing `input`.
 * Holiday hook: pass `isHoliday(date)` to skip specific dates.
 * By default, weekends are skipped and no holidays are excluded.
 */
export const lastWorkingDayOfMonth = (input, isHoliday = () => false) => {
  const d = toMYDate(input)
  const year = d.getUTCFullYear()
  const monthIdx = d.getUTCMonth()
  const lastDay = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate()

  let day = lastDay
  while (day > 0) {
    const candidate = new Date(Date.UTC(year, monthIdx, day) - MY_TZ_OFFSET_MS)
    if (!isWeekendMY(candidate) && !isHoliday(candidate)) {
      return candidate
    }
    day--
  }
  // Fallback: shouldn't happen
  return new Date(Date.UTC(year, monthIdx, lastDay) - MY_TZ_OFFSET_MS)
}

/**
 * Next payday on or after `input`. Payday = last working day of the month.
 * If today is on or before this month's payday, returns this month's payday.
 * Otherwise returns next month's.
 */
export const nextPayday = (input = new Date(), isHoliday = () => false) => {
  const d = toMYDate(input)
  const year = d.getUTCFullYear()
  const monthIdx = d.getUTCMonth()
  const todayKey = dayKey(d)

  const thisMonthPayday = lastWorkingDayOfMonth(input, isHoliday)
  if (dayKey(thisMonthPayday) >= todayKey) {
    return thisMonthPayday
  }

  const nextMonthSeed = new Date(Date.UTC(year, monthIdx + 1, 1))
  return lastWorkingDayOfMonth(nextMonthSeed, isHoliday)
}

/**
 * Is today the payday?
 */
export const isTodayPayday = (input = new Date(), isHoliday = () => false) => {
  return dayKey(input) === dayKey(nextPayday(input, isHoliday))
}

/**
 * Whole calendar days between two MY-local dates. Ignores time of day.
 * Returns b - a. Positive if b is after a.
 */
export const daysBetweenMY = (a, b) => {
  const aMY = toMYDate(a)
  const bMY = toMYDate(b)
  const aMs = Date.UTC(aMY.getUTCFullYear(), aMY.getUTCMonth(), aMY.getUTCDate())
  const bMs = Date.UTC(bMY.getUTCFullYear(), bMY.getUTCMonth(), bMY.getUTCDate())
  return Math.round((bMs - aMs) / (1000 * 60 * 60 * 24))
}

/**
 * Due date for a commitment in a given month.
 * `dueDay` is clamped to the last day of the month.
 */
export const dueDateForMonth = (dueDay, year, monthIdx) => {
  const lastDay = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate()
  const effectiveDay = Math.min(dueDay, lastDay)
  return new Date(Date.UTC(year, monthIdx, effectiveDay) - MY_TZ_OFFSET_MS)
}

/**
 * Next due occurrence on or after `now`.
 */
export const nextDueOccurrence = (dueDay, now = new Date()) => {
  const d = toMYDate(now)
  const year = d.getUTCFullYear()
  const monthIdx = d.getUTCMonth()

  const thisMonthDue = dueDateForMonth(dueDay, year, monthIdx)
  if (dayKey(thisMonthDue) >= dayKey(now)) {
    return thisMonthDue
  }
  return dueDateForMonth(dueDay, year, monthIdx + 1)
}

/**
 * All unpaid occurrences between start-of-this-month and payday (inclusive
 * of both ends). Includes overdue occurrences from this month.
 *
 * Returns an array of Date objects, ordered from earliest to latest.
 */
export const occurrencesUntil = (dueDay, now = new Date(), payday = null) => {
  const paydayFinal = payday || nextPayday(now)
  const paydayKey = dayKey(paydayFinal)
  const d = toMYDate(now)
  const year = d.getUTCFullYear()
  const monthIdx = d.getUTCMonth()

  const occurrences = []
  // Check this month, next month, and one after (max safety)
  for (let i = 0; i <= 2; i++) {
    const occDate = dueDateForMonth(dueDay, year, monthIdx + i)
    const occKey = dayKey(occDate)
    if (occKey <= paydayKey) {
      occurrences.push(occDate)
    }
  }
  return occurrences
}

/**
 * Is a commitment paid for the month containing `occurrenceDate`?
 * Shared by the commitments radar and the burn rate engine.
 */
export const isOccurrencePaid = (commitment, occurrenceDate = new Date()) => {
  if (!commitment?.last_paid) return false
  const paid = new Date(commitment.last_paid)
  const occ = toMYDate(occurrenceDate)
  return (
    paid.getFullYear() === occ.getUTCFullYear() &&
    paid.getMonth() === occ.getUTCMonth()
  )
}

/**
 * Backward-compatible wrapper — the radar still calls this.
 */
export const isPaidThisMonth = (lastPaidISO, now = new Date()) => {
  if (!lastPaidISO) return false
  return isOccurrencePaid({ last_paid: lastPaidISO }, now)
}