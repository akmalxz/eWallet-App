// src/components/shared/ColorPicker.jsx
import { useState } from 'react'
import { Check } from 'lucide-react'
import { COLOR_THEMES } from '../../utils/theme/themeRegistry'

const TABS = [
  { id: 'gradient', label: 'Gradient' },
  { id: 'matte', label: 'Matte' },
  { id: 'shiny', label: 'Shiny' }
]

export const ColorPicker = ({ value, onChange }) => {
  const [activeTab, setActiveTab] = useState(() => {
    // Auto-select the tab of the currently active color if it exists
    const currentTheme = COLOR_THEMES.find(t => t.key === value)
    return currentTheme?.category || 'gradient'
  })

  // Filter themes by the active tab and remove retired ones
  const activeThemes = COLOR_THEMES.filter(
    t => !t.retired && (t.category || 'gradient') === activeTab
  )

  return (
    <div role="radiogroup" aria-label="Card color">
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

      {/* Swatches Grid */}
      <div className="flex flex-wrap gap-2 animate-fadeIn">
        {activeThemes.map(theme => {
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
                  ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface'
                  : 'ring-1 ring-line hover:ring-line-strong'
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
    </div>
  )
}