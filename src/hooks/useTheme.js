// src/hooks/useTheme.js
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'theme'
const MODES = ['light', 'dark', 'system']

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(preference) {
  return preference === 'system' ? getSystemTheme() : preference
}

function apply(resolved) {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

export function useTheme() {
  const [preference, setPreference] = useState(() => {
    if (typeof window === 'undefined') return 'system'
    const saved = localStorage.getItem(STORAGE_KEY)
    return MODES.includes(saved) ? saved : 'system'
  })

  useEffect(() => {
    apply(resolve(preference))
    localStorage.setItem(STORAGE_KEY, preference)
  }, [preference])

  // Follow OS changes while in "system" mode
  useEffect(() => {
    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => apply(getSystemTheme())
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preference])

  const cycle = useCallback(() => {
    setPreference(p => (p === 'light' ? 'dark' : p === 'dark' ? 'system' : 'light'))
  }, [])

  return { preference, setPreference, cycle, resolved: resolve(preference) }
}