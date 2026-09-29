// src/utils/dateHelpers.js
export const MY_TZ_OFFSET_MS = 8 * 60 * 60 * 1000

// Convert any input to a MY-local Date (as a UTC-like Date for consistency)
export const toMYDate = (input) => {
  const d = input instanceof Date ? input : new Date(input)
  return new Date(d.getTime() + MY_TZ_OFFSET_MS)
}

// Start of MY-day, returned as a real UTC instant
export const startOfDayMY = (input) => {
  const d = toMYDate(input)
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - MY_TZ_OFFSET_MS
  )
}

// Start of week (Monday) in MY
export const startOfWeekMY = (input) => {
  const d = startOfDayMY(input)
  const dow = toMYDate(d).getUTCDay() // 0=Sun..6=Sat
  const diff = dow === 0 ? -6 : 1 - dow
  const shifted = toMYDate(d)
  shifted.setUTCDate(shifted.getUTCDate() + diff)
  return new Date(shifted.getTime() - MY_TZ_OFFSET_MS)
}

// Start of month in MY
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

// Last N month buckets ending at now, as MY-aware objects
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

// MY-local day of week (0=Mon..6=Sun)
export const myWeekdayIndex = (input) => {
  const d = toMYDate(input)
  const js = d.getUTCDay() // 0=Sun..6=Sat
  return js === 0 ? 6 : js - 1
}