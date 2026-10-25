// src/utils/analytics/categories.js

export const mainCat = (cat) => (cat || 'Uncategorized').split(' > ')[0].trim()

// Money that goes toward your future, so “up” is good news.
export const POSITIVE_CATEGORIES = ['Savings', 'Investment', 'Investments']

export const isPositiveCategory = (cat) => {
  const main = mainCat(cat).toLowerCase()
  return POSITIVE_CATEGORIES.some(c => c.toLowerCase() === main)
}