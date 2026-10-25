// src/utils/analytics/smallLeaks.js

// Normalizes strings so "GRAB *1234" and "Grab *9981" match
const normaliseText = (s) =>
  (s || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/ +/g, ' ').trim()

const quantile = (arr, q) => {
  const s = arr.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  if (!s.length) return 0
  const pos = (s.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

export const findSmallLeaks = (expenses, { minCount = 4, limit = 5 } = {}) => {
  if (!expenses || expenses.length < 20) return []

  // "Small" = an average purchase below what 60% of all your purchases cost.
  const smallCutoff = quantile(expenses.map((t) => Number(t.amount) || 0), 0.6)
  const groups = new Map()

  expenses.forEach((tx) => {
    const key = normaliseText(tx.description)
    if (!key) return
    
    const g = groups.get(key) || { key, name: tx.description, txns: [], total: 0 }
    g.txns.push(tx)
    g.total += Number(tx.amount) || 0
    groups.set(key, g)
  })

  return [...groups.values()]
    .filter((g) => {
      const count = g.txns.length
      const avg = g.total / count
      return count >= minCount && avg <= smallCutoff
    })
    .map((g) => ({ 
      ...g, 
      count: g.txns.length, 
      avg: g.total / g.txns.length 
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}