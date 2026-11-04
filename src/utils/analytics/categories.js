// src/utils/analytics/categories.js

export const POSITIVE_CATEGORIES = [
  'Income',
  'Salary',
  'Investment Return',
  'Dividends',
  'Cashback',
  'Refund',
  'Grant',
  'Bonus'
]

export const mainCat = (cat) => (cat || 'Uncategorized').split(' > ')[0].trim()

export const isPositiveCategory = (cat) => {
  const main = mainCat(cat).toLowerCase()
  return POSITIVE_CATEGORIES.some(c => c.toLowerCase() === main)
}
