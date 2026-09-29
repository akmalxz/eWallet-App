// src/utils/categoryColors.js

// Stable color per main category name. Same category always same color.
const KNOWN = {
  'Food & Beverages':   '#3b82f6',
  'Food & Dining':      '#3b82f6',
  'Transport':          '#10b981',
  'Shopping':           '#f59e0b',
  'Bills & Utilities':  '#ef4444',
  'Utilities':          '#ef4444',
  'Health':             '#8b5cf6',
  'Entertainment':      '#ec4899',
  'Education':          '#06b6d4',
  'Rent':               '#84cc16',
  'Groceries':          '#14b8a6',
  'Subscription':       '#a855f7',
  'Travel':             '#0ea5e9',
  'Income':             '#22c55e',
  'Commitments':        '#f97316',
  'Gift':               '#e879f9',
  'Other':              '#94a3b8',
  'Uncategorized':      '#cbd5e1'
}

// Fallback palette for unknown categories
const FALLBACK = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#14b8a6', '#a855f7'
]

const hashString = (str) => {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return h
}

export const getCategoryColor = (categoryName) => {
  if (!categoryName) return KNOWN['Uncategorized']
  const key = String(categoryName).split(' > ')[0].trim()
  if (KNOWN[key]) return KNOWN[key]
  const idx = Math.abs(hashString(key)) % FALLBACK.length
  return FALLBACK[idx]
}

export const rollUpToMain = (category) => {
  if (!category) return 'Uncategorized'
  return String(category).split(' > ')[0].trim() || 'Uncategorized'
}

export const OTHER_COLOR = KNOWN['Other']