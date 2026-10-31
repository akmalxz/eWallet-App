// src/components/shared/RowMenu.jsx
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

export const RowMenu = ({ actions = [], ariaLabel = 'Options' }) => {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, right: 0 })
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  const handleOpen = (e) => {
    e.stopPropagation()
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      // Calculate fixed position based on the button's viewport position
      setCoords({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(e.target) && 
        buttonRef.current && 
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    
    // Close the menu when scrolling to avoid it floating detached from the button
    const handleScroll = () => setOpen(false)

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  if (actions.length === 0) return null

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        // ADDED: flex items-center justify-center w-8 h-8
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
          open ? 'bg-surface-2 text-fg' : 'text-fg-subtle hover:text-fg hover:bg-surface-2'
        }`}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Render the menu into document.body to escape any overflow-hidden parents */}
      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999]" onClick={() => setOpen(false)}>
          <div
            ref={menuRef}
            className="absolute w-44 bg-surface border border-line rounded-xl shadow-xl py-1 animate-fadeIn"
            style={{ top: coords.top, right: coords.right }}
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  action.onClick()
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors ${
                  action.danger 
                    ? 'text-danger hover:bg-danger-soft' 
                    : 'text-fg hover:bg-surface-2'
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}