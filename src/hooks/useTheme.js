// src/hooks/useTheme.js
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'theme'
const VALID = ['light', 'dark']

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(resolved) {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

export function useTheme() {
  const [preference, setPreference] = useState(() => {
    if (typeof window === 'undefined') return 'light'

    const saved = localStorage.getItem(STORAGE_KEY)
    if (VALID.includes(saved)) return saved

    return getSystemTheme()
  })

  useEffect(() => {
    apply(preference)
    localStorage.setItem(STORAGE_KEY, preference)
  }, [preference])

  return { preference, setPreference, resolved: preference }
}