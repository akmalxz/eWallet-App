// src/components/modals/PersonalDetailsModal.jsx
import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Save, AlertTriangle } from 'lucide-react'
import { ModalWrapper } from './ModalWrapper'
import { SlidingSegmentedControl } from '../shared/SlidingSegmentedControl'

const PAYDAY_OPTIONS = [
  { id: 'last_working_day', label: 'Last working day' },
  { id: 'specific_date', label: 'Specific date' }
]

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

const checkWeekendConflict = (day) => {
  if (!day || day < 1 || day > 31) return null
  const now = new Date()
  
  // Check this month and next month
  const datesToCheck = [
    new Date(now.getFullYear(), now.getMonth(), day),
    new Date(now.getFullYear(), now.getMonth() + 1, day)
  ]

  for (const d of datesToCheck) {
    const dow = d.getDay()
    if (dow === 0 || dow === 6) { // Sunday or Saturday
      const nearest = new Date(d)
      if (dow === 0) nearest.setDate(d.getDate() - 2) // Friday
      if (dow === 6) nearest.setDate(d.getDate() - 1) // Friday
      
      return {
        conflictDay: d.getDate(),
        dayName: dow === 0 ? 'Sunday' : 'Saturday',
        nearestWorkingDay: nearest.getDate()
      }
    }
  }
  return null
}

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
  
  const [paydayType, setPaydayType] = useState(profile?.payday_type || 'last_working_day')
  const [paydayDate, setPaydayDate] = useState(profile?.payday_date || '')
  
  const [saving, setSaving] = useState(false)

  const weekendConflict = useMemo(() => {
    if (paydayType !== 'specific_date') return null
    return checkWeekendConflict(parseInt(paydayDate))
  }, [paydayType, paydayDate])

  const handleSave = async (e) => {
    e.preventDefault()

    if (!username.trim()) {
      showToast('Please choose a username', 'warning')
      return
    }

    if (paydayType === 'specific_date') {
      const day = parseInt(paydayDate)
      if (isNaN(day) || day < 1 || day > 31) {
        showToast('Please enter a valid day between 1 and 31', 'warning')
        return
      }
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
          username: username.trim(),
          payday_type: paydayType,
          payday_date: paydayType === 'specific_date' ? parseInt(paydayDate) : null
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pd-firstname" className="block text-xs font-bold text-fg-subtle uppercase mb-1.5">
              First Name
            </label>
            <input
              id="pd-firstname"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full h-[46px] bg-surface-2 border border-line-strong rounded-xl py-2 px-3 text-sm text-fg outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition-all"
              placeholder="e.g. Ali"
            />
          </div>
          <div>
            <label htmlFor="pd-lastname" className="block text-xs font-bold text-fg-subtle uppercase mb-1.5">
              Last Name
            </label>
            <input
              id="pd-lastname"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full h-[46px] bg-surface-2 border border-line-strong rounded-xl py-2 px-3 text-sm text-fg outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition-all"
              placeholder="e.g. Hakim"
            />
          </div>
        </div>

        <div>
          <label htmlFor="pd-username" className="block text-xs font-bold text-fg-subtle uppercase mb-1.5">
            Username <span className="text-danger">*</span>
          </label>
          <input
            id="pd-username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full h-[46px] bg-surface-2 border border-line-strong rounded-xl py-2 px-3 text-sm text-fg outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition-all"
            placeholder="e.g. ali_xx"
          />
        </div>

        <div>
          <label htmlFor="pd-email" className="block text-xs font-bold text-fg-subtle uppercase mb-1.5">
            Email
          </label>
          <input
            id="pd-email"
            type="email"
            value={user?.email || ''}
            readOnly
            className="w-full h-[46px] bg-surface-3 border border-line rounded-xl py-2 px-3 text-sm text-fg-subtle cursor-not-allowed outline-none"
          />
        </div>

        {/* PAYDAY SETTINGS */}
        <div className="pt-4 border-t border-line space-y-3">
          <label className="block text-xs font-bold text-fg-subtle uppercase">Payday</label>
          <SlidingSegmentedControl
            items={PAYDAY_OPTIONS}
            value={paydayType}
            onChange={setPaydayType}
          />

          {paydayType === 'specific_date' && (
            <div className="animate-fadeIn space-y-3">
              <div>
                <label htmlFor="pd-payday-date" className="block text-xs font-bold text-fg-subtle mb-1.5">
                  Day of the month
                </label>
                <input
                  id="pd-payday-date"
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={paydayDate}
                  onChange={(e) => setPaydayDate(e.target.value)}
                  className="w-full h-[46px] bg-surface-2 border border-line-strong rounded-xl py-2 px-3 text-sm text-fg outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition-all"
                  placeholder="e.g. 25"
                />
              </div>

              {weekendConflict && (
                <div className="bg-warning-soft border border-warning-border rounded-xl p-3 flex items-start gap-2 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div className="text-xs text-warning-text leading-relaxed">
                    <p className="font-bold mb-1">Heads up!</p>
                    <p>
                      The <strong>{weekendConflict.conflictDay}{getOrdinal(weekendConflict.conflictDay)}</strong> falls on a <strong>{weekendConflict.dayName}</strong> this month.
                      If you get paid on a working day, you might want to use the <strong>{weekendConflict.nearestWorkingDay}{getOrdinal(weekendConflict.nearestWorkingDay)}</strong> instead.
                    </p>
                    <p className="mt-1 opacity-80 italic">You can still proceed with the {weekendConflict.conflictDay}{getOrdinal(weekendConflict.conflictDay)} if that's correct for you.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || !username.trim()}
          className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          style={{ minHeight: 44 }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </ModalWrapper>
  )
}