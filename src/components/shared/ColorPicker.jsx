// src/components/shared/ColorPicker.jsx
import { Check } from 'lucide-react'
import { COLOR_THEMES } from '../../utils/theme/themeRegistry'

// ===========================================================================
// ColorPicker
// Wrapping grid of 44px swatches. Uses the theme registry — never
// reads/writes raw keys directly.
// Selected state = ring + check mark (not color alone).
// ===========================================================================
export const ColorPicker = ({ value, onChange }) => {
  const themes = COLOR_THEMES.filter(t => !t.retired)

  return (
    <div
      role="radiogroup"
      aria-label="Card color"
      className="flex flex-wrap gap-2"
    >
      {themes.map(theme => {
        const [c1, c2] = theme.gradient
        const isSelected = value === theme.key
        const checkColor = theme.tone === 'light' ? '#ffffff' : '#0f172a'

        return (
          <button
            key={theme.key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={theme.name}
            title={theme.name}
            onClick={() => onChange(theme.key)}
            className={`relative w-11 h-11 rounded-xl transition-all duration-200 shrink-0 ${
              isSelected
                ? 'ring-2 ring-slate-900 ring-offset-2'
                : 'ring-1 ring-white/40 hover:ring-slate-300'
            }`}
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
          >
            {isSelected && (
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Check
                  className="w-5 h-5"
                  strokeWidth={3}
                  style={{ color: checkColor }}
                />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}