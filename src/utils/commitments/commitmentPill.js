// src/utils/commitments/commitmentPill.js
import { toMYDate, monthShortName } from '../dateHelpers'

/**
 * Given a schedule period and a reference "now" (MY-local), returns a
 * short label and a color-class string for the pill shown on bill rows.
 *
 * The same period will render differently depending on how close `now`
 * is to its due date — that's the point.
 */
export const getPeriodPill = (period, nowMY) => {
  const dueMY = toMYDate(period.dueDate)
  const isSameMonth =
    dueMY.getUTCFullYear() === nowMY.getUTCFullYear() &&
    dueMY.getUTCMonth() === nowMY.getUTCMonth()

  if (period.daysOverdue > 0) {
    const prefix = isSameMonth ? '' : `${monthShortName(period.dueDate)} · `
    return {
      label: `${prefix}${period.daysOverdue}d overdue`,
      color: 'text-danger-text bg-danger-soft border border-danger-border'
    }
  }
  if (period.daysUntil === 0) {
    return { label: 'Due today', color: 'text-danger-text bg-danger-soft border border-danger-border' }
  }
  if (period.daysUntil <= 3) {
    return { label: `In ${period.daysUntil}d`, color: 'text-warning-text bg-warning-soft border border-warning-border' }
  }
  if (period.daysUntil <= 7) {
    return { label: `In ${period.daysUntil}d`, color: 'text-info-text bg-info-soft border border-info-border' }
  }
  return {
    label: `Due ${dueMY.getUTCDate()} ${monthShortName(period.dueDate)}`,
    color: 'text-fg-muted bg-surface-2 border border-line'
  }
}