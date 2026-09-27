// src/components/modals/PersonalDetailsModal.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Save } from 'lucide-react'
import { ModalWrapper } from './ModalWrapper'

export const PersonalDetailsModal = ({
  user,
  profile,
  closeModal,
  showToast,
  refreshProfile
}) => {
  // ----------------------------------------------------------
  // Form state (pre-filled from existing profile)
  // ----------------------------------------------------------
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName] = useState(profile?.last_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [saving, setSaving] = useState(false)

  // ----------------------------------------------------------
  // Save handler
  // ----------------------------------------------------------
  const handleSave = async (e) => {
    e.preventDefault()

    // Client-side required check (HTML `required` also enforces this)
    if (!username.trim()) {
      showToast('Please choose a username', 'warning')
      return
    }

    setSaving(true)

    try {
      // 1. Pre-check username uniqueness (excluding self)
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim())
        .neq('id', user.id)
        .maybeSingle()

      if (checkError) throw checkError

      if (existing) {
        showToast(
          'That username is already taken. Please choose another.',
          'warning'
        )
        return
      }

      // 2. Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim()
        })
        .eq('id', user.id)

      if (error) {
        // Handle UNIQUE constraint race condition (someone claimed it in between)
        const isDuplicate =
          error.code === '23505' ||
          error.message?.toLowerCase().includes('duplicate') ||
          error.message?.toLowerCase().includes('unique')

        if (isDuplicate) {
          showToast(
            'That username is already taken. Please choose another.',
            'warning'
          )
          return
        }

        throw error
      }

      showToast('Personal details updated successfully!', 'success')

      if (refreshProfile) {
        await refreshProfile()
      }

      closeModal()
    } catch (error) {
      showToast(error.message || 'Error updating profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  return (
    <ModalWrapper title="Personal Information" closeModal={closeModal}>
      <form onSubmit={handleSave} className="space-y-4">

        <div>
          <label
            htmlFor="pd-firstname"
            className="block text-xs font-bold text-slate-500 uppercase mb-1.5"
          >
            First Name
          </label>
          <input
            id="pd-firstname"
            name="pd-firstname"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Muhammad Akmal Hakim"
          />
        </div>

        <div>
          <label
            htmlFor="pd-lastname"
            className="block text-xs font-bold text-slate-500 uppercase mb-1.5"
          >
            Last Name
          </label>
          <input
            id="pd-lastname"
            name="pd-lastname"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Hakim"
          />
        </div>

        <div>
          <label
            htmlFor="pd-username"
            className="block text-xs font-bold text-slate-500 uppercase mb-1.5"
          >
            Username <span className="text-red-500">*</span>
          </label>
          <input
            id="pd-username"
            name="pd-username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. akmalhakim"
          />
          <p className="text-[10px] text-slate-400 mt-1.5">
            This is how others will find you in the network.
          </p>
        </div>

        <div>
          <label
            htmlFor="pd-email"
            className="block text-xs font-bold text-slate-500 uppercase mb-1.5"
          >
            Email
          </label>
          <input
            id="pd-email"
            name="pd-email"
            type="email"
            value={user?.email || ''}
            readOnly
            className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-500 cursor-not-allowed outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !username.trim()}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

      </form>
    </ModalWrapper>
  )
}