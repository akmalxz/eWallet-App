// src/components/shared/PatternPicker.jsx
import { Check } from 'lucide-react'
import { PATTERNS, getColorTheme } from '../../utils/themeRegistry'

// ---------------------------------------------------------------------------
// Same caching strategy as AccountCard. Generation is done once per
// (pattern, tone) pair. Never per render.
// ---------------------------------------------------------------------------
const patternCache = new Map()
const getPatternSvg = (patternKey, tone) => {
  const key = `${patternKey}-${tone}`
  if (patternCache.has(key)) return patternCache.get(key)
  const pattern = PATTERNS.find(p => p.key === patternKey)
  const svg = pattern?.svg ? pattern.svg(tone) : 'none'
  patternCache.set(key, svg)
  return svg
}

export const PatternPicker = ({ value, colorThemeKey, onChange }) => {
  // Preview uses the currently selected color so users see the pairing live
  const theme = getColorTheme(colorThemeKey)
  const [c1, c2] = theme.gradient
  const gradient = `linear-gradient(135deg, ${c1}, ${c2})`

  return (
    <div
      role="radiogroup"
      aria-label="Card pattern"
      className="grid grid-cols-4 gap-2"
    >
      {PATTERNS.map(pattern => {
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
                ? 'ring-2 ring-slate-900 ring-offset-2'
                : 'ring-1 ring-slate-200 hover:ring-slate-400'
            }`}
            style={{ background: gradient }}
          >
            {/* Pattern overlay — higher opacity in the picker so small tiles read clearly */}
            {pattern.key !== 'none' && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: patternSvg,
                  opacity: 0.42
                }}
                aria-hidden="true"
              />
            )}

            {/* Selected check */}
            {isSelected && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-6 h-6 rounded-full bg-white/95 flex items-center justify-center shadow-md">
                  <Check className="w-3.5 h-3.5 text-slate-900" strokeWidth={3} />
                </span>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}