// src/utils/analyticsColors.js
export const COLORS = {
  up: '#ef4444',        // peak / overspend / increase
  down: '#10b981',      // savings / decrease
  prev: '#cbd5e1',      // previous period
  current: '#3b82f6',   // current series
  accent: '#8b5cf6',
  neutral: '#64748b',
  grid: '#e2e8f0',
  zero: '#f1f5f9'
}

// Calendar heatmap intensity scale (5 levels, one hue)
export const HEATMAP_LEVELS = [
  '#f1f5f9', // 0 - zero spend (very light)
  '#dbeafe', // 1
  '#93c5fd', // 2
  '#3b82f6', // 3
  '#1e40af'  // 4 - peak
]

// Category series colors (used by stacked bars)
export const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'
]