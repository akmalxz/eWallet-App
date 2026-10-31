// src/components/shared/IconPicker.jsx
import { useState } from 'react'
import { Check } from 'lucide-react'
import { getIconsByCategory, getColorTheme } from '../../utils/theme/themeRegistry'
import { BANK_REGISTRY } from '../../utils/theme/bankRegistry'

export const IconPicker = ({
  value,
  colorThemeKey,
  previewLetter = 'A',
  onChange
}) => {
  const [activeTab, setActiveTab] = useState('logos') // 'logos' | 'icons'
  
  const theme = getColorTheme(colorThemeKey)
  const [c1, c2] = theme.gradient
  const groups = getIconsByCategory()

  const letterTextColor = theme.tone === 'light' ? '#ffffff' : '#0f172a'

  const renderButton = (icon) => {
    const isSelected = value === icon.key || value === icon.logo
    const isLetter = icon.key === 'letter'
    const IconComponent = icon.component

    return (
      <button
        key={icon.key || icon.logo}
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-label={icon.name || icon.label}
        title={icon.name || icon.label}
        onClick={() => onChange(icon.logo || icon.key)}
        className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 overflow-hidden ${
          isLetter || icon.logo ? '' : 'bg-surface-2'
        } ${
          isSelected
            ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface'
            : 'ring-1 ring-line hover:ring-line-strong'
        }`}
        style={
          isLetter
            ? { background: `linear-gradient(135deg, ${c1}, ${c2})` }
            : icon.logo ? { background: '#ffffff' } : undefined
        }
      >
        {isLetter ? (
          <span className="text-sm font-black" style={{ color: letterTextColor }}>
            {previewLetter}
          </span>
        ) : icon.logo ? (
          <img src={icon.logo} alt={icon.label} className="w-full h-full object-cover rounded-xl" />
        ) : IconComponent ? (
          <IconComponent className="w-5 h-5 text-fg-muted" aria-hidden="true" />
        ) : null}

        {isSelected && (
          <span className="absolute top-0 right-0 w-4 h-4 rounded-bl-lg bg-fg flex items-center justify-center shadow-sm">
            <Check className="w-2.5 h-2.5 text-fg-inverse" strokeWidth={3} />
          </span>
        )}
      </button>
    )
  }

  return (
    <div role="radiogroup" aria-label="Card icon">
      
      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4 bg-surface-2 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('logos')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'logos'
              ? 'bg-surface text-fg shadow-sm'
              : 'text-fg-subtle hover:text-fg'
          }`}
        >
          Bank Logos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('icons')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'icons'
              ? 'bg-surface text-fg shadow-sm'
              : 'text-fg-subtle hover:text-fg'
          }`}
        >
          Standard Icons
        </button>
      </div>

      {/* Bank Logos Tab */}
      {activeTab === 'logos' && (
        <div className="flex flex-wrap gap-2 animate-fadeIn">
          {BANK_REGISTRY.map(renderButton)}
        </div>
      )}

      {/* Standard Icons Tab */}
      {activeTab === 'icons' && (
        <div className="flex flex-wrap gap-2 animate-fadeIn">
          {Object.values(groups).flat().map(renderButton)}
        </div>
      )}
      
    </div>
  )
}