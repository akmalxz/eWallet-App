// src/components/shared/Avatar.jsx
import { useMemo } from 'react'
import { Pencil } from 'lucide-react'
import { createAvatar } from '@dicebear/core'
import {
  adventurer, bottts, lorelei, micah, notionists, personas
} from '@dicebear/collection'

// ============================================================
// Curated illustrated styles — 6 hand-picked DiceBear families
// ============================================================
export const AVATAR_STYLES = [
  { key: 'lorelei',    label: 'Lorelei',    module: lorelei },
  { key: 'micah',      label: 'Micah',      module: micah },
  { key: 'notionists', label: 'Notionists', module: notionists },
  { key: 'personas',   label: 'Personas',   module: personas },
  { key: 'bottts',     label: 'Robots',     module: bottts },
  { key: 'adventurer', label: 'Adventurer', module: adventurer },
]

const STYLE_MAP = Object.fromEntries(
  AVATAR_STYLES.map(s => [s.key, s.module])
)

// ============================================================
// Monogram color palette
// ============================================================
export const AVATAR_COLORS = [
  { key: 'blue',     bg: '#3b82f6', text: '#ffffff' },
  { key: 'indigo',   bg: '#4f46e5', text: '#ffffff' },
  { key: 'sky',      bg: '#0ea5e9', text: '#ffffff' },
  { key: 'cyan',     bg: '#0891b2', text: '#ffffff' },
  { key: 'teal',     bg: '#14b8a6', text: '#ffffff' },
  { key: 'emerald',  bg: '#10b981', text: '#ffffff' },
  { key: 'lime',     bg: '#84cc16', text: '#0f172a' },
  { key: 'amber',    bg: '#f59e0b', text: '#0f172a' },
  { key: 'orange',   bg: '#f97316', text: '#ffffff' },
  { key: 'rose',     bg: '#f43f5e', text: '#ffffff' },
  { key: 'fuchsia',  bg: '#d946ef', text: '#ffffff' },
  { key: 'purple',   bg: '#a855f7', text: '#ffffff' },
  { key: 'slate',    bg: '#475569', text: '#ffffff' },
  { key: 'midnight', bg: '#1e293b', text: '#ffffff' },
  { key: 'cream',    bg: '#fef3c7', text: '#0f172a' },
  { key: 'mist',     bg: '#e2e8f0', text: '#0f172a' },
]

const COLOR_MAP = Object.fromEntries(
  AVATAR_COLORS.map(c => [c.key, c])
)

// ============================================================
// Size map
// ============================================================
const SIZES = { xs: 24, sm: 32, md: 48, lg: 64, xl: 96 }

// ============================================================
// Illustrated URI cache
// ============================================================
const illustratedCache = new Map()
const MAX_CACHE = 300

function getIllustratedUri(styleKey, seed, sizePx) {
  const cacheKey = `${styleKey}:${seed}:${sizePx}`
  if (illustratedCache.has(cacheKey)) return illustratedCache.get(cacheKey)

  const styleModule = STYLE_MAP[styleKey]
  if (!styleModule) return null

  try {
    const avatar = createAvatar(styleModule, {
      seed: seed || 'default',
      size: sizePx * 2,
    })
    const uri = avatar.toDataUri()

    if (illustratedCache.size >= MAX_CACHE) {
      const firstKey = illustratedCache.keys().next().value
      illustratedCache.delete(firstKey)
    }
    illustratedCache.set(cacheKey, uri)
    return uri
  } catch (err) {
    console.error('Avatar generation failed:', err)
    return null
  }
}

// ============================================================
// Deterministic color from a key string
// ============================================================
function defaultColorForKey(key) {
  if (!key) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

// ============================================================
// AVATAR COMPONENT
// ============================================================
export const Avatar = ({
  profile,
  size = 'md',
  className = '',
  onClick,
  showEditBadge = false,
  ariaLabel = 'Change avatar'
}) => {
  const px = SIZES[size] || SIZES.md
  const badgePx = Math.max(28, Math.round(px * 0.36))
  const kind = profile?.avatar_kind || 'monogram'

  const displayInitial = useMemo(() => {
    const src =
      profile?.first_name?.trim() ||
      profile?.username?.trim() ||
      profile?.email?.trim() ||
      '?'
    return src.charAt(0).toUpperCase()
  }, [profile?.first_name, profile?.username, profile?.email])

  const monogramColor = useMemo(() => {
    const key = profile?.avatar_color
    return key
      ? (COLOR_MAP[key] || defaultColorForKey(displayInitial))
      : defaultColorForKey(displayInitial)
  }, [profile?.avatar_color, displayInitial])

  const illustratedUri = useMemo(() => {
    if (kind !== 'illustrated') return null
    const raw = profile?.avatar_value || ''
    const [styleKey, ...rest] = raw.split(':')
    const seed = rest.join(':') || displayInitial.toLowerCase()
    if (!styleKey) return null
    return getIllustratedUri(styleKey, seed, px)
  }, [kind, profile?.avatar_value, displayInitial, px])

  const inner =
    kind === 'illustrated' && illustratedUri ? (
      <img
        src={illustratedUri}
        alt=""
        width={px}
        height={px}
        className="block w-full h-full"
        draggable={false}
      />
    ) : (
      <span
        className="flex items-center justify-center w-full h-full font-bold select-none"
        style={{
          background: monogramColor.bg,
          color: monogramColor.text,
          fontSize: px * 0.42,
        }}
      >
        {displayInitial}
      </span>
    )

  // ------------------------------------------------------------
  // EDIT-BADGE VARIANT
  // Avatar itself is non-interactive; only the pencil button
  // opens the picker. The pencil carries no-min-tap so the
  // global 44px mobile rule doesn't inflate it.
  // ------------------------------------------------------------
  if (showEditBadge && onClick) {
    return (
      <div
        className={`relative inline-block shrink-0 ${className}`}
        style={{ width: px, height: px }}
      >
        <div className="rounded-full overflow-hidden w-full h-full">
          {inner}
        </div>

        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          className="no-min-tap absolute flex items-center justify-center rounded-full bg-surface border border-line shadow-md hover:scale-110 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2 focus:ring-offset-surface"
          style={{
            width: badgePx,
            height: badgePx,
            bottom: -badgePx * 0.15,
            right: -badgePx * 0.15,
          }}
        >
          <Pencil
            className="text-fg-muted"
            style={{ width: badgePx * 0.45, height: badgePx * 0.45 }}
            strokeWidth={2.5}
          />
        </button>
      </div>
    )
  }

  // ------------------------------------------------------------
  // CLICKABLE VARIANT (whole avatar is a button)
  // Kept for other call sites that want the entire avatar tappable.
  // ------------------------------------------------------------
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`rounded-full overflow-hidden shrink-0 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2 focus:ring-offset-surface ${className}`}
        style={{ width: px, height: px }}
      >
        {inner}
      </button>
    )
  }

  // ------------------------------------------------------------
  // NON-INTERACTIVE
  // ------------------------------------------------------------
  return (
    <div
      aria-hidden="true"
      className={`rounded-full overflow-hidden shrink-0 ${className}`}
      style={{ width: px, height: px }}
    >
      {inner}
    </div>
  )
}