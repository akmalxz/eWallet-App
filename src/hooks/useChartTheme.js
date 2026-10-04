// src/hooks/useChartTheme.js
import { useEffect, useState } from 'react'
import { CHART_THEMES } from '../utils/analytics/chartColors'

/**
 * Returns the active theme's chart color palette.
 * Re-renders consumers when the `.dark` class on <html> toggles.
 */
export function useChartTheme() {
  const [mode, setMode] = useState(() => {
    if (typeof document === 'undefined') return 'light'
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      const next = root.classList.contains('dark') ? 'dark' : 'light'
      setMode((prev) => (prev === next ? prev : next))
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return CHART_THEMES[mode]
}