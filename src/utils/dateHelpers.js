// src/utils/dateHelpers.js
export const MY_TZ_OFFSET_MS = 8 * 60 * 60 * 1000

// ===========================================================================
// Core MY-aware helpers
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

export const myNoonISO = (dateString) => {
  return new Date(`${dateString}T12:00:00+08:00`).toISOString()
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

export const monthShortName = (input = new Date()) => {
  const d = toMYDate(input)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toLocaleString(
    'en-MY',
    { month: 'short', timeZone: 'UTC' }
  )
}

export const monthFullName = (input = new Date()) => {
  const d = toMYDate(input)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toLocaleString(
    'en-MY',
    { month: 'long', year: 'numeric', timeZone: 'UTC' }
  )
}

// ===========================================================================
// Payday helpers
// ===========================================================================
const isWeekendMY = (d) => {
  const dow = toMYDate(d).getUTCDay()
  return dow === 0 || dow === 6
}

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
  return new Date(Date.UTC(year, monthIdx, lastDay) - MY_TZ_OFFSET_MS)
}

export const nextPayday = (
  input = new Date(), 
  isHoliday = () => false, 
  paydayType = 'last_working_day', 
  paydayDate = null
) => {
  const d = toMYDate(input)
  const year = d.getUTCFullYear()
  const monthIdx = d.getUTCMonth()
  const todayKey = dayKey(d)

  if (paydayType === 'specific_date' && paydayDate) {
    const getSpecificPayday = (y, m) => {
      const lastDay = daysInMonth(y, m)
      const effectiveDay = Math.min(paydayDate, lastDay)
      return new Date(Date.UTC(y, m, effectiveDay) - MY_TZ_OFFSET_MS)
    }

    const thisMonthPayday = getSpecificPayday(year, monthIdx)
    if (dayKey(thisMonthPayday) >= todayKey) return thisMonthPayday

    return getSpecificPayday(year, monthIdx + 1)
  }

  // Default: Last working day of the month
  const thisMonthPayday = lastWorkingDayOfMonth(input, isHoliday)
  if (dayKey(thisMonthPayday) >= todayKey) return thisMonthPayday

  const nextMonthSeed = new Date(Date.UTC(year, monthIdx + 1, 1))
  return lastWorkingDayOfMonth(nextMonthSeed, isHoliday)
}

export const isTodayPayday = (
  input = new Date(), 
  isHoliday = () => false, 
  paydayType = 'last_working_day', 
  paydayDate = null
) => {
  return dayKey(input) === dayKey(nextPayday(input, isHoliday, paydayType, paydayDate))
}

export const daysBetweenMY = (a, b) => {
  const aMY = toMYDate(a)
  const bMY = toMYDate(b)
  const aMs = Date.UTC(aMY.getUTCFullYear(), aMY.getUTCMonth(), aMY.getUTCDate())
  const bMs = Date.UTC(bMY.getUTCFullYear(), bMY.getUTCMonth(), bMY.getUTCDate())
  return Math.round((bMs - aMs) / (1000 * 60 * 60 * 24))
}

export const dueDateForMonth = (dueDay, year, monthIdx) => {
  const lastDay = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate()
  const effectiveDay = Math.min(dueDay, lastDay)
  return new Date(Date.UTC(year, monthIdx, effectiveDay) - MY_TZ_OFFSET_MS)
}

// ===========================================================================
// Financial Cycle Helpers (Payday-Aware)
// ===========================================================================

export const getPayCycle = (
  now = new Date(),
  paydayType = 'last_working_day',
  paydayDate = null
) => {
  const currentMY = toMYDate(now)
  const year = currentMY.getUTCFullYear()
  const monthIdx = currentMY.getUTCMonth()
  const today = dayKey(currentMY)

  const thisMonthSeed = new Date(Date.UTC(year, monthIdx, 1))
  const thisMonthPayday = nextPayday(thisMonthSeed, () => false, paydayType, paydayDate)

  let startDate, endDate

  if (today >= dayKey(thisMonthPayday)) {
    // We are currently in the cycle that started this month
    startDate = thisMonthPayday

    const nextMonthSeed = new Date(Date.UTC(year, monthIdx + 1, 1))
    const nextMonthPayday = nextPayday(nextMonthSeed, () => false, paydayType, paydayDate)

    // END-OF-DAY of the cycle's last day (1ms before the next cycle
    // begins). Inclusive `<= endDate` filters now correctly include
    // the entire final day rather than just its midnight instant.
    endDate = new Date(nextMonthPayday.getTime() - 1)
  } else {
    // We are currently in the cycle that started last month
    const lastMonthSeed = new Date(Date.UTC(year, monthIdx - 1, 1))
    startDate = nextPayday(lastMonthSeed, () => false, paydayType, paydayDate)

    endDate = new Date(thisMonthPayday.getTime() - 1)
  }

  return { startDate, endDate }
}


/**
 * Generates an array of pay cycles (e.g., for charting 3M, 6M).
 */
export const lastNCycles = (
  count,
  now = new Date(),
  paydayType = 'last_working_day',
  paydayDate = null
) => {
  const cycles = []
  let seed = now

  for (let i = 0; i < count; i++) {
    const { startDate, endDate } = getPayCycle(seed, paydayType, paydayDate)

    // `startDate` / `endDate` are MY-midnight Dates stored 8h behind UTC
    // (e.g. MY midnight Oct 24 is Oct 23 16:00 UTC internally). Formatting
    // them directly with timeZone: 'UTC' shows the previous day. Shift
    // through toMYDate() first so the wall-clock day matches MY.
    const startLabel = toMYDate(startDate).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })
    const endLabel = toMYDate(endDate).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })

    cycles.unshift({
      key: dayKey(startDate),
      startDate,
      endDate,
      label: `${startLabel} - ${endLabel}`,
    })

    seed = new Date(startDate.getTime() - 86400000)
  }

  return cycles
}