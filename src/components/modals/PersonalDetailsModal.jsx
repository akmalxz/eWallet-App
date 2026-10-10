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
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName] = useState(profile?.last_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()

    if (!username.trim()) {
      showToast('Please choose a username', 'warning')
      return
    }

    setSaving(true)

    try {
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim())
        .neq('id', user.id)
        .maybeSingle()

      if (checkError) throw checkError

      if (existing) {
        showToast('That username is already taken. Please choose another.', 'warning')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim()
        })
        .eq('id', user.id)

      if (error) {
        const isDuplicate =
          error.code === '23505' ||
          error.message?.toLowerCase().includes('duplicate') ||
          error.message?.toLowerCase().includes('unique')

        if (isDuplicate) {
          showToast('That username is already taken. Please choose another.', 'warning')
          return
        }

        throw error
      }

      showToast('Personal details updated successfully!', 'success')

      if (refreshProfile) await refreshProfile()
      closeModal()
    } catch (error) {
      showToast(error.message || 'Error updating profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalWrapper title="Personal Information" closeModal={closeModal}>
      <form onSubmit={handleSave} className="space-y-4">

        <div>
          <label
            htmlFor="pd-firstname"
            className="block text-xs font-bold text-fg-subtle uppercase mb-1.5"
          >
            First Name
          </label>
          <input
            id="pd-firstname"
            name="pd-firstname"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition-all"
            placeholder="e.g. Ali bin Abu"
          />
        </div>

        <div>
          <label
            htmlFor="pd-lastname"
            className="block text-xs font-bold text-fg-subtle uppercase mb-1.5"
          >
            Last Name
          </label>
          <input
            id="pd-lastname"
            name="pd-lastname"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition-all"
            placeholder="e.g. Hakim"
          />
        </div>

        <div>
          <label
            htmlFor="pd-username"
            className="block text-xs font-bold text-fg-subtle uppercase mb-1.5"
          >
            Username <span className="text-danger">*</span>
          </label>
          <input
            id="pd-username"
            name="pd-username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition-all"
            placeholder="e.g. ali_xx"
          />
          <p className="text-[10px] text-fg-subtle mt-1.5">
            This is how others will find you in the network.
          </p>
        </div>

        <div>
          <label
            htmlFor="pd-email"
            className="block text-xs font-bold text-fg-subtle uppercase mb-1.5"
          >
            Email
          </label>
          <input
            id="pd-email"
            name="pd-email"
            type="email"
            value={user?.email || ''}
            readOnly
            className="w-full bg-surface-3 border border-line rounded-xl py-2 px-3 text-sm text-fg-subtle cursor-not-allowed outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !username.trim()}
          className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

      </form>
    </ModalWrapper>
  )
}