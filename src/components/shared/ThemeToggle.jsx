// src/components/shared/ThemeToggle.jsx
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

const OPTIONS = [
  { value: 'light', Icon: Sun,  label: 'Light' },
  { value: 'dark',  Icon: Moon, label: 'Dark' },
]

export function ThemeToggle({ className = '' }) {
  const { preference, setPreference } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`inline-flex items-center gap-0.5 p-0.5 rounded-full bg-surface-2 border border-line ${className}`}
    >
      {OPTIONS.map(({ value, Icon, label }) => {
        const active = preference === value

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setPreference(value)}
            className={`no-min-tap flex items-center justify-center w-8 h-8 p-0 rounded-full transition-colors ${
              active
                ? 'bg-surface text-fg shadow-sm'
                : 'text-fg-subtle hover:text-fg'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        )
      })}
    </div>
  )
}