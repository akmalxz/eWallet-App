// src/components/shared/AccountDropdown.jsx
import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { AccountCard } from './AccountCard'

// A synthetic account used for the "All accounts" option
const ALL_ACCOUNTS = {
  id: 'all',
  account_name: 'All accounts',
  classification: null,
  color_theme: 'slate',
  pattern: 'none',
  icon: 'bank'
}

// ===========================================================================
// AccountDropdown
// Custom account picker that shows colored pills on the trigger and in the
// option list (no icon — see showIcon={false} below).
// Bottom sheet on mobile, floating panel on desktop. Full keyboard support.
// ===========================================================================
export const AccountDropdown = ({
  accounts = [],
  value,
  onChange,
  includeAll = true,
  label = 'Account',
  placeholder = 'Select account'
}) => {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const [focusedIndex, setFocusedIndex] = useState(0)

  const options = includeAll ? [ALL_ACCOUNTS, ...accounts] : accounts
  const selected = options.find(o => o.id === value) || options[0]

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      listRef.current?.focus()
      const idx = options.findIndex(o => o.id === value)
      setFocusedIndex(idx >= 0 ? idx : 0)
    }, 40)
    return () => clearTimeout(t)
  }, [open, options, value])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const handleSelect = (accountId) => {
    onChange(accountId)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const handleListKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const option = options[focusedIndex]
      if (option) handleSelect(option.id)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setFocusedIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setFocusedIndex(options.length - 1)
    }
  }

  const triggerChip = (
    <span className="min-w-0 flex-1 text-left">
      <AccountCard
        account={selected || { id: 'none', account_name: placeholder, color_theme: 'slate' }}
        size="chip"
        showIcon={false}
      />
    </span>
  )

  return (
    <>
      {/* ============ TRIGGER ============ */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="w-full flex items-center gap-2 bg-white/70 backdrop-blur-xl border border-white/60 rounded-xl py-2 pl-2 pr-3 min-h-[48px] transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
      >
        {triggerChip}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* ============ PANEL ============ */}
      {open && (
        <div
          className="fixed inset-0 z-[130] flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full md:max-w-sm bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            <div className="px-5 py-3 md:py-4 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-bold text-slate-800">{label}</h3>
            </div>

            <div
              ref={listRef}
              role="listbox"
              tabIndex={-1}
              aria-label={label}
              onKeyDown={handleListKeyDown}
              className="flex-1 overflow-y-auto p-2 space-y-1 focus:outline-none"
              style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
            >
              {options.map((acc, idx) => {
                const isSelected = acc.id === value
                const isFocused = idx === focusedIndex

                return (
                  <button
                    key={acc.id}
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    onClick={() => handleSelect(acc.id)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-left transition-colors min-h-[52px] ${
                      isFocused ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <AccountCard account={acc} size="chip" showIcon={false} />
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-slate-700 shrink-0" strokeWidth={3} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}