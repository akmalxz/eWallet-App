// src/components/shared/IconPicker.jsx
import { Check } from 'lucide-react'
import { getIconsByCategory, getColorTheme } from '../../utils/themeRegistry'

export const IconPicker = ({
  value,
  colorThemeKey,
  previewLetter = 'A',
  onChange
}) => {
  const theme = getColorTheme(colorThemeKey)
  const [c1, c2] = theme.gradient
  const groups = getIconsByCategory()

  // Icon color inside the tile: slate on light tiles, white on the letter tile
  const letterTextColor = theme.tone === 'light' ? '#ffffff' : '#0f172a'

  const renderButton = (icon) => {
    const isSelected = value === icon.key
    const isLetter = icon.key === 'letter'
    const IconComponent = icon.component

    return (
      <button
        key={icon.key}
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-label={icon.name}
        title={icon.name}
        onClick={() => onChange(icon.key)}
        className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
          isSelected
            ? 'ring-2 ring-slate-900 ring-offset-2'
            : 'ring-1 ring-slate-200 hover:ring-slate-400'
        }`}
        style={{
          background: isLetter
            ? `linear-gradient(135deg, ${c1}, ${c2})`
            : '#f8fafc'
        }}
      >
        {isLetter ? (
          <span
            className="text-sm font-black"
            style={{ color: letterTextColor }}
          >
            {previewLetter}
          </span>
        ) : IconComponent ? (
          <IconComponent
            className="w-5 h-5 text-slate-600"
            aria-hidden="true"
          />
        ) : null}

        {/* Selected check — placed as a corner badge so it doesn't cover the icon */}
        {isSelected && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center shadow-sm">
            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </span>
        )}
      </button>
    )
  }

  return (
    <div role="radiogroup" aria-label="Card icon" className="space-y-4">
      {Object.entries(groups).map(([category, icons]) => (
        <div key={category}>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
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