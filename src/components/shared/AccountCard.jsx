// src/components/shared/AccountCard.jsx
import { memo } from 'react'
import {
  Plus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  CreditCard, Settings, Pin
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { getColorTheme, getIcon, getPattern } from '../../utils/themeRegistry'

// ---------------------------------------------------------------------------
// Pattern SVG cache — one data URI per (patternKey, tone) combo.
// The guide calls this out explicitly: generate each tile once per
// pattern and tone, and reuse it. Do not create new ones per card.
// ---------------------------------------------------------------------------
const patternCache = new Map()
const getPatternSvg = (patternKey, tone) => {
  const key = `${patternKey}-${tone}`
  if (patternCache.has(key)) return patternCache.get(key)
  const pattern = getPattern(patternKey)
  const svg = pattern.svg ? pattern.svg(tone) : 'none'
  patternCache.set(key, svg)
  return svg
}

// ===========================================================================
// AccountCard
// Renders one of three sizes: 'full' | 'chip' | 'dot'.
// Accepts a saved account, or `draft` overrides for the editor preview.
// ===========================================================================
export const AccountCard = memo(function AccountCard({
  account,
  draft,
  size = 'full',
  showBalance = true,
  isExpanded = false,
  classificationLabel = 'Account',
  canMoveUp = false,
  canMoveDown = false,
  onToggleExpand,
  onTogglePin,
  onMoveAccount,
  onLogTransaction,
  onManageAccount,
  onClick
}) {
  // Merge saved account with draft overrides (editor preview path)
  const data = draft ? { ...account, ...draft } : account

  // Always go through the registry helpers — never read a raw key
  const theme = getColorTheme(data.color_theme)
  const iconEntry = getIcon(data.icon)
  const isLetterIcon = iconEntry.key === 'letter'
  const IconComponent = isLetterIcon ? null : iconEntry.component

  const [c1, c2] = theme.gradient
  const gradient = `linear-gradient(135deg, ${c1}, ${c2})`
  const textColor = theme.tone === 'light' ? '#ffffff' : '#0f172a'
  const textMuted = theme.tone === 'light' ? 'rgba(255,255,255,0.72)' : 'rgba(15,23,42,0.62)'
  const isPinned = !!data.is_pinned

  const firstLetter = (data.account_name || '?').trim().charAt(0).toUpperCase() || '?'

  // ------------------------------------------------------------
  // DOT — legends and tight spaces
  // ------------------------------------------------------------
  if (size === 'dot') {
    return (
      <span
        className="inline-block w-3 h-3 rounded-full shrink-0"
        style={{ background: gradient }}
        aria-hidden="true"
      />
    )
  }

  // ------------------------------------------------------------
  // CHIP — inline labels for transaction rows, selectors, filters
  // ------------------------------------------------------------
  if (size === 'chip') {
    return (
      <span
        className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-lg text-xs font-semibold max-w-full"
        style={{ background: gradient, color: textColor }}
      >
        <span
          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.18)' }}
        >
          {isLetterIcon ? (
            <span className="text-[10px] font-bold" style={{ color: textColor }}>
              {firstLetter}
            </span>
          ) : IconComponent ? (
            <IconComponent className="w-3 h-3" style={{ color: textColor }} />
          ) : null}
        </span>
        <span className="truncate">{data.account_name}</span>
      </span>
    )
  }

  // ------------------------------------------------------------
  // FULL CARD — dashboard, accounts view, editor preview
  // ------------------------------------------------------------
  const hasPattern = data.pattern && data.pattern !== 'none'
  const patternSvg = hasPattern ? getPatternSvg(data.pattern, theme.tone) : 'none'

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl overflow-hidden shadow-xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] h-full flex flex-col justify-between border ${
        isPinned ? 'ring-2 ring-white/60 ring-offset-0' : ''
      } ${
        isExpanded ? 'shadow-2xl' : 'hover:shadow-lg md:hover:scale-[1.02]'
      }`}
      style={{
        background: gradient,
        borderColor: 'rgba(255,255,255,0.3)'
      }}
    >
      {/* Depth overlay (bottom shade) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.2), transparent)'
        }}
      />

      {/* Pattern overlay — faded toward the balance area so text stays clear */}
      {hasPattern && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: patternSvg,
            opacity: 0.12,
            WebkitMaskImage: 'radial-gradient(circle at 82% 18%, black 0%, transparent 72%)',
            maskImage: 'radial-gradient(circle at 82% 18%, black 0%, transparent 72%)'
          }}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="relative p-4 md:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              >
                {isLetterIcon ? (
                  <span className="text-sm font-bold" style={{ color: textColor }}>
                    {firstLetter}
                  </span>
                ) : IconComponent ? (
                  <IconComponent className="w-5 h-5" style={{ color: textColor }} />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: textMuted }}>
                  {classificationLabel}
                </p>
                <p className="text-sm font-bold truncate" style={{ color: textColor }}>
                  {data.account_name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              {onTogglePin && (
                <button
                  onClick={(e) => { e.stopPropagation(); onTogglePin(data) }}
                  className={`flex items-center justify-center p-1.5 rounded-full transition-all duration-300 ${
                    isPinned ? 'ring-2 ring-white/60 shadow-lg' : ''
                  }`}
                  style={{
                    background: isPinned ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)'
                  }}
                  aria-label={isPinned ? 'Unpin account' : 'Pin account to top'}
                  title={isPinned ? 'Unpin' : 'Pin to top'}
                >
                  <Pin
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${
                      isPinned ? 'rotate-0' : 'rotate-45'
                    }`}
                    style={{
                      color: textColor,
                      fill: isPinned ? textColor : 'transparent'
                    }}
                  />
                </button>
              )}

              {onToggleExpand && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
                  className="flex items-center justify-center p-1.5 rounded-full transition-all duration-300"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                  aria-label={isExpanded ? 'Collapse card' : 'Expand card'}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" style={{ color: textColor }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: textColor }} />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Balance */}
          <div className="mb-2">
            <p className="text-xs" style={{ color: textMuted }}>Balance</p>
            <p
              className="text-2xl font-bold tracking-tight break-all"
              style={{ color: textColor }}
            >
              {showBalance ? formatMYR(data.balance || 0) : '••••••'}
            </p>
          </div>
        </div>

        {/* Expanded panel — only mounted when a toggle handler exists */}
        {onToggleExpand && (
          <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
            <div className="overflow-hidden">
              <div
                className="pt-4 space-y-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}
              >
                {/* Primary actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    className="flex-1 text-xs font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    style={{ background: 'rgba(255,255,255,0.22)', color: textColor }}
                    onClick={(e) => { e.stopPropagation(); onLogTransaction?.(data) }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Transaction
                  </button>
                  <button
                    className="flex-1 text-xs font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    style={{ background: 'rgba(255,255,255,0.1)', color: textColor }}
                    onClick={(e) => { e.stopPropagation(); onManageAccount?.(data) }}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Manage
                  </button>
                </div>

                {/* Reorder controls */}
                {onMoveAccount && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onMoveAccount(data.id, 'up') }}
                      disabled={!canMoveUp}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-colors"
                      style={{
                        background: canMoveUp ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                        color: canMoveUp
                          ? textColor
                          : (theme.tone === 'light' ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.3)'),
                        cursor: canMoveUp ? 'pointer' : 'not-allowed'
                      }}
                      aria-label={canMoveUp ? `Move ${data.account_name} earlier` : 'Cannot move earlier'}
                    >
                      <ChevronUp className="md:hidden w-3.5 h-3.5" />
                      <span className="md:hidden">Up</span>
                      <ChevronLeft className="hidden md:inline w-3.5 h-3.5" />
                      <span className="hidden md:inline">Left</span>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); onMoveAccount(data.id, 'down') }}
                      disabled={!canMoveDown}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-colors"
                      style={{
                        background: canMoveDown ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                        color: canMoveDown
                          ? textColor
                          : (theme.tone === 'light' ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.3)'),
                        cursor: canMoveDown ? 'pointer' : 'not-allowed'
                      }}
                      aria-label={canMoveDown ? `Move ${data.account_name} later` : 'Cannot move later'}
                    >
                      <ChevronDown className="md:hidden w-3.5 h-3.5" />
                      <span className="md:hidden">Down</span>
                      <ChevronRight className="hidden md:inline w-3.5 h-3.5" />
                      <span className="hidden md:inline">Right</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative px-4 pb-3 flex items-center justify-between mt-auto">
        <div className="flex gap-1.5" style={{ color: textColor, opacity: 0.3 }}>
          <span className="text-[10px] font-mono">••••</span>
          <span className="text-[10px] font-mono">••••</span>
          <span className="text-[10px] font-mono">••••</span>
          <span className="text-[10px] font-mono" style={{ opacity: 1.4 }}>••••</span>
        </div>
        <CreditCard className="w-4 h-4" style={{ color: textColor, opacity: 0.3 }} />
      </div>
    </div>
  )
})