// src/utils/analytics/categoryColors.js

// Semantic overrides — these colors carry meaning, so keep them fixed.
const KNOWN = {
  'Income':       '#22c55e',  // green = positive
  'Commitments':  '#f97316',  // orange = fixed cost
  'Other':        '#94a3b8',
  'Uncategorized': '#cbd5e1',
}

// Deterministic hash — same input, same output, forever.
const hashString = (str) => {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/**
 * Returns a stable, distinct color for a category name.
 * 
 * - Known categories (Income, Commitments) get their semantic colors.
 * - Everything else gets a deterministic HSL color derived from a hash.
 * - The Golden Angle (137.5°) guarantees that adjacent hash values produce 
 *   visually distant hues, so no two categories ever look the same.
 * 
 * @param {string} categoryName - The category (e.g. 'Food & Beverages')
 * @param {boolean} isDark - Whether the app is in dark mode
 */
export const getCategoryColor = (categoryName, isDark = false) => {
  if (!categoryName) return isDark ? '#64748b' : '#cbd5e1'

  // Match semantic overrides first
  const key = String(categoryName).split(' > ')[0].trim()
  if (KNOWN[key]) return KNOWN[key]

  // Generate a deterministic hue from the name
  const hash = hashString(key)
  const hue = (hash * 137.508) % 360

  // Adjust lightness/saturation for dark mode
  const saturation = isDark ? 60 : 65
  const lightness = isDark ? 55 : 50

  return `hsl(${hue.toFixed(0)}, ${saturation}%, ${lightness}%)`
}

export const rollUpToMain = (category) => {
  if (!category) return 'Uncategorized'
  return String(category).split(' > ')[0].trim() || 'Uncategorized'
}

export const OTHER_COLOR = KNOWN['Other']