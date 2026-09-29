// src/components/shared/AccountChipRow.jsx
import { useRef, useState, useLayoutEffect, useMemo, useCallback } from 'react'

export const AccountChipRow = ({
  accounts = [],
  value,
  onChange,
  includeAll = true
}) => {
  const containerRef = useRef(null)
  const chipRefs = useRef([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false })

  const chips = useMemo(() => [
    ...(includeAll ? [{ id: 'all', account_name: 'All' }] : []),
    ...accounts
  ], [accounts, includeAll])

  const activeIndex = chips.findIndex(c => c.id === value)

  // Measure the active chip and position the sliding pill
  const measure = useCallback(() => {
    const el = chipRefs.current[activeIndex]
    const container = containerRef.current
    if (!el || !container) return

    const elRect = el.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    setIndicator({
      left: elRect.left - containerRect.left + container.scrollLeft,
      width: elRect.width,
      ready: true
    })
  }, [activeIndex])

  useLayoutEffect(() => { measure() }, [measure, chips.length, accounts.length])

  useLayoutEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  if (!chips.length) return null

  return (
    <div
      ref={containerRef}
      className="relative flex items-center h-11 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.05)] overflow-x-auto scrollbar-hide"
    >
      {/* Sliding black pill — measured position, spring overshoot */}
      {indicator.ready && (
        <div
          className="absolute top-1 bottom-1 rounded-xl bg-gradient-to-b from-slate-900 to-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}

      {chips.map((chip, idx) => {
        const isActive = chip.id === value
        return (
          <button
            key={chip.id}
            ref={el => (chipRefs.current[idx] = el)}
            onClick={() => onChange(chip.id)}
            aria-pressed={isActive}
            className={`relative z-10 shrink-0 h-full px-4 text-xs font-bold transition-colors duration-300 ${
              isActive
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="truncate max-w-[120px] block">
              {chip.account_name}
            </span>
          </button>
        )
      })}
    </div>
  )
}