// src/utils/analytics/chartColors.js

// ============================================================
// LEGACY EXPORTS — kept for backwards compatibility.
// BurnRateWidget.jsx still imports COLORS. Any new code
// should use useChartTheme() instead.
// ============================================================
export const COLORS = {
  up: '#ef4444',
  down: '#10b981',
  prev: '#cbd5e1',
  current: '#3b82f6',
  accent: '#8b5cf6',
  neutral: '#64748b',
  grid: '#e2e8f0',
  zero: '#f1f5f9'
}

export const HEATMAP_LEVELS = [
  '#f1f5f9',
  '#dbeafe',
  '#93c5fd',
  '#3b82f6',
  '#1e40af'
]

export const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'
]

// ============================================================
// THEME-AWARE CHART PALETTES
// Consumed by useChartTheme(). Recharts resolves SVG attrs
// at render time, so it needs concrete hex values — not CSS
// vars — to react correctly to theme changes.
// ============================================================
export const CHART_THEMES = {
  light: {
    up: '#ef4444',
    down: '#10b981',
    prev: '#cbd5e1',
    current: '#3b82f6',
    accent: '#8b5cf6',
    neutral: '#64748b',
    grid: '#e2e8f0',
    zero: '#f1f5f9',
    axis: '#94a3b8',
    cursor: '#cbd5e1',
    dotStroke: '#ffffff',
    heatmap: ['#f1f5f9', '#dbeafe', '#93c5fd', '#3b82f6', '#1e40af'],
    heatTextLight: '#475569',
    heatTextStrong: '#ffffff',
    category: [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
      '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'
    ]
  },
  dark: {
    up: '#f87171',
    down: '#34d399',
    prev: '#475569',
    current: '#60a5fa',
    accent: '#a78bfa',
    neutral: '#94a3b8',
    grid: '#1e293b',
    zero: '#1e293b',
    axis: '#94a3b8',
    cursor: '#475569',
    dotStroke: '#0f172a',
    heatmap: ['#1e293b', '#1e3a8a', '#1d4ed8', '#3b82f6', '#93c5fd'],
    heatTextLight: '#cbd5e1',
    heatTextStrong: '#0f172a',
    category: [
      '#60a5fa', '#34d399', '#fbbf24', '#f87171',
      '#a78bfa', '#22d3ee', '#f472b6', '#a3e635'
    ]
  }
}