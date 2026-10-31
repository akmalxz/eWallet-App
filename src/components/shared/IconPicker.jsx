// src/components/shared/IconPicker.jsx
import { Check } from 'lucide-react'
import { getIconsByCategory, getColorTheme } from '../../utils/theme/themeRegistry'
import { BANK_REGISTRY } from '../../utils/theme/bankRegistry'

export const IconPicker = ({
  value,
  colorThemeKey,
  previewLetter = 'A',
  onChange
}) => {
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
          <span
            className="text-sm font-black"
            style={{ color: letterTextColor }}
          >
            {previewLetter}
          </span>
        ) : icon.logo ? (
          <img src={icon.logo} alt={icon.label} className="w-8 h-8 object-contain p-1" />
        ) : IconComponent ? (
          <IconComponent
            className="w-5 h-5 text-fg-muted"
            aria-hidden="true"
          />
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
    <div role="radiogroup" aria-label="Card icon" className="space-y-4">
      
      {/* Bank Logos Section */}
      <div>
        <h4 className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-2">
          Bank Logos
        </h4>
        <div className="flex flex-wrap gap-2">
          {BANK_REGISTRY.map(renderButton)}
        </div>
      </div>

      {/* Standard Icons Section */}
      {Object.entries(groups).map(([category, icons]) => (
        <div key={category}>
          <h4 className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-2">
            {category}
          </h4>
          <div className="flex flex-wrap gap-2">
            {icons.map(renderButton)}
          </div>
        </div>
      ))}
    </div>
  )
}