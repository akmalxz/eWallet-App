// src/components/shared/RowMenu.jsx
import { useState, useEffect, useRef } from 'react'
import { MoreVertical } from 'lucide-react'

/**
 * Generic kebab-menu dropdown. Actions are supplied by the caller.
 * Handles:
 *   - open/close state
 *   - close on outside click
 *   - close on Escape
 *
 * actions: [{ label, icon, onClick, danger?, disabled? }]
 */
export const RowMenu = ({ actions, ariaLabel = 'Actions' }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 min-w-[170px] bg-surface border border-line rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {actions.map((a) => (
            <button
              key={a.label}
              role="menuitem"
              type="button"
              disabled={a.disabled}
              onClick={() => {
                setOpen(false)
                a.onClick()
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left transition-colors disabled:opacity-50 ${
                a.danger ? 'text-danger hover:bg-danger-soft' : 'text-fg-muted hover:bg-surface-2'
              }`}
              style={{ minHeight: 44 }}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}