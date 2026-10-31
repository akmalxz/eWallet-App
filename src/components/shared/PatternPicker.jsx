// src/components/shared/PatternPicker.jsx
import { useState } from 'react'
import { Check, Ban } from 'lucide-react'
import { PATTERNS, getColorTheme } from '../../utils/theme/themeRegistry'

const patternCache = new Map()
const getPatternSvg = (patternKey, tone) => {
  const key = `${patternKey}-${tone}`
  if (patternCache.has(key)) return patternCache.get(key)
  const pattern = PATTERNS.find(p => p.key === patternKey)
  const svg = pattern?.svg ? pattern.svg(tone) : 'none'
  patternCache.set(key, svg)
  return svg
}

const TABS = [
  { id: 'geometric', label: 'Shapes' },
  { id: 'linear', label: 'Lines' },
  { id: 'texture', label: 'Texture' }
]

export const PatternPicker = ({ value, colorThemeKey, onChange }) => {
  const [activeTab, setActiveTab] = useState(() => {
    // Auto-select the tab of the currently active pattern
    const currentPattern = PATTERNS.find(p => p.key === value)
    return currentPattern?.category !== 'none' ? currentPattern?.category || 'geometric' : 'geometric'
  })

  const theme = getColorTheme(colorThemeKey)
  const [c1, c2] = theme.gradient
  const gradient = `linear-gradient(135deg, ${c1}, ${c2})`

  const activePatterns = PATTERNS.filter(p => p.category === activeTab)

  return (
    <div role="radiogroup" aria-label="Card pattern">
      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4 bg-surface-2 p-1 rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-surface text-fg shadow-sm'
                : 'text-fg-subtle hover:text-fg'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 animate-fadeIn">
        {/* "None" button (Always visible in the first slot) */}
        {activeTab === 'geometric' && (
          <button
            type="button"
            role="radio"
            aria-checked={value === 'none'}
            aria-label="No pattern"
            title="None"
            onClick={() => onChange('none')}
            className={`relative aspect-square rounded-xl overflow-hidden transition-all duration-200 flex items-center justify-center ${
              value === 'none'
                ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface'
                : 'ring-1 ring-line hover:ring-line-strong'
            }`}
            style={{ background: 'var(--surface-2)' }}
          >
            <Ban className="w-6 h-6 text-fg-subtle" />
            {value === 'none' && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-6 h-6 rounded-full bg-surface flex items-center justify-center shadow-md">
                  <Check className="w-3.5 h-3.5 text-fg" strokeWidth={3} />
                </span>
              </span>
            )}
          </button>
        )}

        {/* Pattern Options */}
        {activePatterns.map(pattern => {
          const isSelected = value === pattern.key
          const patternSvg = pattern.key === 'none'
            ? 'none'
            : getPatternSvg(pattern.key, theme.tone)

          return (
            <button
              key={pattern.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={pattern.name}
              title={pattern.name}
              onClick={() => onChange(pattern.key)}
              className={`relative aspect-square rounded-xl overflow-hidden transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface'
                  : 'ring-1 ring-line hover:ring-line-strong'
              }`}
              style={{ background: gradient }}
            >
              {pattern.key !== 'none' && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: patternSvg,
                    opacity: 0.42 // Higher opacity in the picker so small tiles read clearly
                  }}
                  aria-hidden="true"
                />
              )}

              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-6 h-6 rounded-full bg-surface flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 text-fg" strokeWidth={3} />
                  </span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}