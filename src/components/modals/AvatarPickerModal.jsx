// src/components/modals/AvatarPickerModal.jsx
import { useState } from 'react'
import { Shuffle, Check, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { ModalWrapper } from './ModalWrapper'
import {
  Avatar, AVATAR_STYLES, AVATAR_COLORS
} from '../shared/Avatar'

const randomSeed = () =>
  Math.random().toString(36).slice(2, 10)

// Parse existing avatar_value from profile → { styleKey, seed }
const parseIllustrated = (value, fallbackSeed) => {
  if (!value) return { styleKey: AVATAR_STYLES[0].key, seed: fallbackSeed }
  const [styleKey, ...rest] = value.split(':')
  const seed = rest.join(':')
  const validStyle = AVATAR_STYLES.some(s => s.key === styleKey)
  return {
    styleKey: validStyle ? styleKey : AVATAR_STYLES[0].key,
    seed: seed || fallbackSeed,
  }
}

export const AvatarPickerModal = ({
  user,
  profile,
  closeModal,
  showToast,
  refreshProfile
}) => {
  // Seed fallback derived from identity — used when no illustrated seed exists yet
  const identitySeed =
    profile?.username?.trim() ||
    profile?.first_name?.trim() ||
    user?.email?.split('@')[0] ||
    'flow'

  const initialKind = profile?.avatar_kind || 'monogram'
  const initialColor = profile?.avatar_color || null
  const initialIllustrated = parseIllustrated(profile?.avatar_value, identitySeed)

  const [kind, setKind] = useState(initialKind)
  const [styleKey, setStyleKey] = useState(initialIllustrated.styleKey)
  const [seed, setSeed] = useState(initialIllustrated.seed)
  const [color, setColor] = useState(initialColor)
  const [saving, setSaving] = useState(false)

  // Preview object — Avatar renders this exactly like a real profile
  const draftProfile = {
    first_name: profile?.first_name,
    username: profile?.username,
    email: user?.email,
    avatar_kind: kind,
    avatar_value: kind === 'illustrated' ? `${styleKey}:${seed}` : null,
    avatar_color: color,
  }

  const hasChanges =
    kind !== initialKind ||
    (kind === 'monogram' && color !== initialColor) ||
    (kind === 'illustrated' && (
      styleKey !== initialIllustrated.styleKey ||
      seed !== initialIllustrated.seed
    ))

  const handleShuffle = () => setSeed(randomSeed())

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_kind: kind,
          avatar_value: kind === 'illustrated' ? `${styleKey}:${seed}` : null,
          avatar_color: kind === 'monogram' ? color : null,
        })
        .eq('id', user.id)

      if (error) throw error

      showToast('Avatar updated', 'success')
      if (refreshProfile) await refreshProfile()
      closeModal()
    } catch (err) {
      showToast(err.message || 'Could not save avatar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalWrapper title="Customize Avatar" closeModal={closeModal}>
      <div className="space-y-5">

        {/* PREVIEW */}
        <div className="flex justify-center py-2">
          <Avatar profile={draftProfile} size="xl" />
        </div>

        {/* TABS */}
        <div className="flex gap-1 bg-surface-2 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setKind('illustrated')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
              kind === 'illustrated'
                ? 'bg-surface text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Illustrated
          </button>
          <button
            type="button"
            onClick={() => setKind('monogram')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
              kind === 'monogram'
                ? 'bg-surface text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Monogram
          </button>
        </div>

        {/* ILLUSTRATED TAB */}
        {kind === 'illustrated' && (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-2">
                Style
              </p>
              <div className="grid grid-cols-3 gap-2 px-3">
                {AVATAR_STYLES.map(s => {
                  const isActive = styleKey === s.key
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setStyleKey(s.key)}
                      className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
                        isActive
                          ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface'
                          : 'ring-1 ring-line hover:ring-line-strong'
                      }`}
                      aria-pressed={isActive}
                      aria-label={s.label}
                    >
                      <Avatar
                        profile={{
                          avatar_kind: 'illustrated',
                          avatar_value: `${s.key}:${seed}`,
                          first_name: profile?.first_name,
                          username: profile?.username,
                          email: user?.email,
                        }}
                        size="md"
                        className="!w-full !h-full !rounded-none"
                      />
                      {isActive && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-fg flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-fg-inverse" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleShuffle}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-fg-muted bg-surface-2 hover:bg-surface-3 transition-colors"
              style={{ minHeight: 40 }}
            >
              <Shuffle className="w-3.5 h-3.5" />
              Shuffle variation
            </button>
          </div>
        )}

        {/* MONOGRAM TAB */}
        {kind === 'monogram' && (
          <div>
            <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-2">
              Background color
            </p>
            <div className="grid grid-cols-8 gap-2 px-3">
              {AVATAR_COLORS.map(c => {
                const isActive = color === c.key
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setColor(c.key)}
                    className={`relative aspect-square rounded-full transition-all ${
                      isActive
                        ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface'
                        : 'ring-1 ring-line hover:ring-line-strong'
                    }`}
                    style={{ background: c.bg }}
                    aria-pressed={isActive}
                    aria-label={c.key}
                    title={c.key}
                  >
                    {isActive && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Check
                          className="w-3.5 h-3.5"
                          strokeWidth={3}
                          style={{ color: c.text }}
                        />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-fg-subtle mt-3 leading-relaxed">
              Your initial is shown on top of the chosen color.
            </p>
          </div>
        )}

        {/* SAVE */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ minHeight: 44 }}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save Avatar'}
        </button>

      </div>
    </ModalWrapper>
  )
}