// src/components/shared/Sheet.jsx
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const Sheet = ({
  title,
  titleId = 'sheet-title',
  saving = false,
  hasUnsavedChanges = false,
  onClose,
  maxWidth = 'md:max-w-md',
  children
}) => {
  const containerRef = useRef(null)
  const previouslyFocused = useRef(null)

  useEffect(() => {
    previouslyFocused.current = document.activeElement
    const root = containerRef.current
    if (root && !root.contains(document.activeElement)) {
      root.querySelector(FOCUSABLE)?.focus()
    }
    return () => {
      const el = previouslyFocused.current
      if (el && typeof el.focus === 'function') {
        setTimeout(() => el.focus?.(), 0)
      }
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        attemptClose()
        return
      }
      if (e.key !== 'Tab') return
      const root = containerRef.current
      if (!root) return
      const nodes = Array.from(root.querySelectorAll(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement
      )
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, hasUnsavedChanges])

  const attemptClose = () => {
    if (saving) return
    if (hasUnsavedChanges) {
      if (!window.confirm('Discard unsaved changes?')) return
    }
    onClose?.()
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200"
      onClick={attemptClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`w-full ${maxWidth} bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[85vh] animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <h3 id={titleId} className="text-base font-bold text-slate-800">
              {title}
            </h3>
            <button
              type="button"
              onClick={attemptClose}
              disabled={saving}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div
          className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}