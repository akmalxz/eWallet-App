// src/components/modals/AccountEditorModal.jsx
import { useState, useEffect, useRef } from 'react'
import {
  X, Save, RotateCcw, Sparkles, AlertCircle
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { AccountCard } from '../shared/AccountCard'
import { ColorPicker } from '../shared/ColorPicker'
import { PatternPicker } from '../shared/PatternPicker'
import { IconPicker } from '../shared/IconPicker'
import { COLOR_THEMES, PATTERNS, ICONS } from '../../utils/themeRegistry'

const NAME_MAX = 30

const buildDefaults = (classifications) => ({
  account_name: '',
  classification: classifications[0]?.key_name || 'hub',
  color_theme: 'blue',
  pattern: 'none',
  icon: 'bank'
})

const fromAccount = (acc) => ({
  account_name: acc?.account_name || '',
  classification: acc?.classification || 'hub',
  color_theme: acc?.color_theme || 'slate',
  pattern: acc?.pattern || 'none',
  icon: acc?.icon || 'bank'
})

export const AccountEditorModal = ({
  user,
  account,
  accounts = [],
  classifications = [],
  onClose,
  onSaved,
  showToast
}) => {
  const isNew = !account
  const nameInputRef = useRef(null)

  const initial = isNew ? buildDefaults(classifications) : fromAccount(account)

  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(initial)

  useEffect(() => {
    const t = setTimeout(() => nameInputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || saving) return
      if (hasChanges) {
        if (window.confirm('Discard unsaved changes?')) onClose()
      } else {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saving, hasChanges, onClose])

  const update = (field, value) => {
    setDraft(d => ({ ...d, [field]: value }))
    if (error) setError('')
  }

  const validate = () => {
    const name = draft.account_name.trim()
    if (!name) return 'Name is required'
    if (name.length > NAME_MAX) return `Name must be ${NAME_MAX} characters or less`
    const lower = name.toLowerCase()
    const dupe = accounts.find(
      a => a.id !== account?.id && a.account_name.toLowerCase() === lower
    )
    if (dupe) return `You already have an account named "${dupe.account_name}"`
    return ''
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }

    setSaving(true)
    setError('')

    try {
      const payload = {
        account_name: draft.account_name.trim(),
        classification: draft.classification,
        color_theme: draft.color_theme,
        pattern: draft.pattern,
        icon: draft.icon
      }

      if (isNew) {
        const { data, error: insertErr } = await supabase
          .from('accounts')
          .insert([{ ...payload, user_id: user.id }])
          .select()

        if (insertErr) throw insertErr
        if (!data || data.length === 0) {
          throw new Error('Create failed — no rows affected. Check RLS on accounts.')
        }
        showToast('Account added', 'success')
      } else {
        const { data, error: updateErr } = await supabase
          .from('accounts')
          .update(payload)
          .eq('id', account.id)
          .select()

        if (updateErr) throw updateErr
        if (!data || data.length === 0) {
          throw new Error('Update failed — no rows affected. Check RLS on accounts.')
        }
        showToast('Account updated', 'success')
      }

      onSaved?.()
    } catch (err) {
      setError(err.message || 'Save failed')
      showToast('Could not save account', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setDraft(isNew ? buildDefaults(classifications) : fromAccount(account))
    setError('')
  }

  // ---------------------------------------------------------------------
  // Surprise me — randomizes color, pattern and icon together.
  // Restricting to non-retired themes keeps the picker in sync.
  // ---------------------------------------------------------------------
  const handleSurprise = () => {
    const activeThemes = COLOR_THEMES.filter(t => !t.retired)
    const randomTheme = activeThemes[Math.floor(Math.random() * activeThemes.length)]
    const randomPattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)]
    const randomIcon = ICONS[Math.floor(Math.random() * ICONS.length)]

    setDraft(d => ({
      ...d,
      color_theme: randomTheme.key,
      pattern: randomPattern.key,
      icon: randomIcon.key
    }))
  }

  const previewAccount = {
    ...(account || {}),
    account_name: draft.account_name || 'Account name',
    classification: draft.classification,
    color_theme: draft.color_theme,
    pattern: draft.pattern,
    icon: draft.icon,
    balance: account?.balance || 0
  }

  const previewClassLabel =
    classifications.find(c => c.key_name === draft.classification)?.label
    || 'Account'

  // First letter used by the IconPicker's "letter" preview
  const previewLetter =
    (draft.account_name.trim().charAt(0) || 'A').toUpperCase()

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end md:items-center justify-center bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[85vh] animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >

        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-bold text-slate-800">
            {isNew ? 'New account' : 'Edit account'}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label="Close editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ================= PINNED PREVIEW ================= */}
        <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-100 shrink-0">
          <div className="max-w-[240px] mx-auto">
            <AccountCard
              account={previewAccount}
              size="full"
              showBalance
              classificationLabel={previewClassLabel}
            />
          </div>
        </div>

        {/* ================= SCROLLABLE BODY ================= */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* ---------- Name ---------- */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="editor-name"
                className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider"
              >
                Name
              </label>
              <span
                className={`text-[10px] font-medium ${
                  draft.account_name.length > NAME_MAX ? 'text-red-500' : 'text-slate-400'
                }`}
              >
                {draft.account_name.length}/{NAME_MAX}
              </span>
            </div>
            <input
              id="editor-name"
              ref={nameInputRef}
              type="text"
              value={draft.account_name}
              onChange={e => update('account_name', e.target.value)}
              maxLength={NAME_MAX + 5}
              placeholder="e.g. Maybank"
              className={`w-full bg-white border ${
                error ? 'border-red-300' : 'border-slate-200'
              } rounded-xl py-3 px-3 text-sm outline-none focus:border-blue-500 transition-colors`}
            />
            {error && (
              <p className="mt-1.5 text-[11px] text-red-500 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </section>

          {/* ---------- Type ---------- */}
          <section>
            <label
              htmlFor="editor-class"
              className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2"
            >
              Type
            </label>
            <select
              id="editor-class"
              value={draft.classification}
              onChange={e => update('classification', e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-3 text-sm outline-none focus:border-blue-500 transition-colors"
            >
              {classifications.map(c => (
                <option key={c.id} value={c.key_name}>{c.label}</option>
              ))}
            </select>
          </section>

          {/* ---------- Color (Phase 5) ---------- */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Color
              </label>
              <button
                type="button"
                onClick={handleSurprise}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
              >
                <Sparkles className="w-3 h-3" />
                Surprise me
              </button>
            </div>
            <ColorPicker
              value={draft.color_theme}
              onChange={(key) => update('color_theme', key)}
            />
          </section>

          {/* ---------- Pattern (Phase 6) ---------- */}
          <section>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Pattern
            </label>
            <PatternPicker
              value={draft.pattern}
              colorThemeKey={draft.color_theme}
              onChange={(key) => update('pattern', key)}
            />
          </section>

          {/* ---------- Icon (Phase 7) ---------- */}
          <section>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Icon
            </label>
            <IconPicker
              value={draft.icon}
              colorThemeKey={draft.color_theme}
              previewLetter={previewLetter}
              onChange={(key) => update('icon', key)}
            />
          </section>

        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-5 py-4 border-t border-slate-100 bg-white shrink-0 space-y-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving || !hasChanges}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ minHeight: 44 }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to default
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
              style={{ minHeight: 44 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ minHeight: 44 }}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}