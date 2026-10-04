// src/utils/commitments/commitmentPayments.js
import { toMYDate } from '../dateHelpers'

// A period is (year, month). Payment status comes from commitments_payments.

export const isPeriodPaid = (payments, commitmentId, year, month) => {
  return payments.some(p =>
    p.commitment_id === commitmentId &&
    p.period_year === year &&
    p.period_month === month &&
    p.status === 'paid'
  )
}

export const isPeriodSkipped = (payments, commitmentId, year, month) => {
  return payments.some(p =>
    p.commitment_id === commitmentId &&
    p.period_year === year &&
    p.period_month === month &&
    p.status === 'skipped'
  )
}

export const isPeriodHandled = (payments, commitmentId, year, month) => {
  return payments.some(p =>
    p.commitment_id === commitmentId &&
    p.period_year === year &&
    p.period_month === month
  )
}

export const getPaymentFor = (payments, commitmentId, year, month) => {
  return payments.find(p =>
    p.commitment_id === commitmentId &&
    p.period_year === year &&
    p.period_month === month
  )
}

// Convenience helpers — use the calendar month of `now` in Malaysia time.
export const isPaidForDate = (payments, commitmentId, now = new Date()) => {
  const d = toMYDate(now)
  return isPeriodPaid(payments, commitmentId, d.getUTCFullYear(), d.getUTCMonth() + 1)
}

export const isSkippedForDate = (payments, commitmentId, now = new Date()) => {
  const d = toMYDate(now)
  return isPeriodSkipped(payments, commitmentId, d.getUTCFullYear(), d.getUTCMonth() + 1)
}

export const isHandledForDate = (payments, commitmentId, now = new Date()) => {
  const d = toMYDate(now)
  return isPeriodHandled(payments, commitmentId, d.getUTCFullYear(), d.getUTCMonth() + 1)
}

export const getPaymentForDate = (payments, commitmentId, now = new Date()) => {
  const d = toMYDate(now)
  return getPaymentFor(payments, commitmentId, d.getUTCFullYear(), d.getUTCMonth() + 1)
}

// Period helpers
export const currentPeriod = (now = new Date()) => {
  const d = toMYDate(now)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
}