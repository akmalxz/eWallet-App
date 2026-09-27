// src/components/modals/BankAccountsModal.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react'
import { ModalWrapper } from './ModalWrapper'

export const BankAccountsModal = ({
  user,
  accounts,
  classifications,
  closeModal,
  fetchAllData,
  showToast
}) => {
  const [newBankName, setNewBankName] = useState('')
  const [newBankClass, setNewBankClass] = useState(
    classifications[0]?.key_name || 'hub'
  )
  const [newBankColor, setNewBankColor] = useState('blue')
  const [saving, setSaving] = useState(false)
  const [showAddBank, setShowAddBank] = useState(false) // NEW STATE

  const [editingItemId, setEditingItemId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editColor, setEditColor] = useState('blue')

  // ----------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------

  const handleAddBank = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('accounts')
        .insert([
          {
            user_id: user.id,
            account_name: newBankName.trim(),
            classification: newBankClass,
            color_theme: newBankColor
          }
        ])

      if (error) throw error

      setNewBankName('')

      showToast('Bank added successfully!', 'success')
      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBank = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)

      if (error) throw error

      showToast('Bank deleted', 'success')
      fetchAllData()
    } catch (error) {
      showToast('Cannot delete this bank. It has transactions.', 'error')
    }
  }

  const handleUpdateBank = async (id) => {
    if (!editValue.trim()) {
      return setEditingItemId(null)
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          account_name: editValue.trim(),
          color_theme: editColor
        })
        .eq('id', id)

      if (error) throw error

      showToast('Bank updated successfully', 'success')
      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
      setEditingItemId(null)
    }
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <ModalWrapper title="Bank Accounts" closeModal={closeModal}>

      <div className="space-y-3">

        {/* Top Actions Row */}
        <button
          onClick={() => setShowAddBank(!showAddBank)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm border ${
            showAddBank
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
          }`}
          aria-label="Add new bank account"
        >
          {showAddBank ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAddBank ? 'Cancel' : 'Add New Bank Account'}
        </button>

        {/* New Bank Inline Form */}
        {showAddBank && (
          <form
            onSubmit={(e) => {
              handleAddBank(e);
              setShowAddBank(false); // Auto-hide after successful add
            }}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-fadeIn"
          >
            <input
              aria-label="New Bank Name"
              autoFocus
              type="text"
              required
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500"
              placeholder="Bank Name (e.g. Maybank)"
            />

            <select
              aria-label="New Bank Classification"
              value={newBankClass}
              onChange={(e) => setNewBankClass(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500"
            >
              {classifications.map(c => (
                <option key={c.id} value={c.key_name}>
                  {c.label}
                </option>
              ))}
            </select>

            <label htmlFor="new-bank-color" className="sr-only">
              Account Color Theme
            </label>

            <select
              id="new-bank-color"
              name="new-bank-color"
              value={newBankColor}
              onChange={(e) => setNewBankColor(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="blue">Blue</option>
              <option value="emerald">Green</option>
              <option value="purple">Purple</option>
              <option value="rose">Red</option>
              <option value="amber">Yellow</option>
              <option value="slate">Dark Grey</option>
            </select>

            <button
              type="submit"
              disabled={saving || !newBankName.trim()}
              className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg text-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Account'}
            </button>
          </form>
        )}


        {/* Existing accounts list */}
        {accounts.map(acc => (

          <div
            key={acc.id}
            className="bg-white/50 p-3 rounded-xl border border-white/60"
          >

            {editingItemId === acc.id ? (

              <div className="flex gap-2">

                <div className="flex-1 space-y-2">

                  <input
                    aria-label="Edit Bank Name"
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-sm outline-none focus:border-blue-500"
                  />

                  <select
                    aria-label="Edit Bank Color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs outline-none focus:border-blue-500"
                  >
                    <option value="blue">Blue</option>
                    <option value="emerald">Green</option>
                    <option value="purple">Purple</option>
                    <option value="rose">Red</option>
                    <option value="amber">Yellow</option>
                    <option value="slate">Dark Grey</option>
                  </select>

                </div>

                <div className="flex flex-col gap-1 shrink-0">

                  <button
                    onClick={() => handleUpdateBank(acc.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200"
                    aria-label="Save bank"
                  >
                    <Save className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setEditingItemId(null)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 text-slate-600 transition-colors hover:bg-slate-300"
                    aria-label="Cancel editing"
                  >
                    <X className="h-4 w-4" />
                  </button>

                </div>

              </div>

            ) : (

              <div className="flex justify-between items-center">

                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {acc.account_name}
                  </p>

                  <p className="text-xs text-slate-400 capitalize">
                    {
                      classifications.find(
                        c => c.key_name === acc.classification
                      )?.label || acc.classification
                    }
                  </p>
                </div>

                <div className="flex items-center gap-1">

                  <button
                    onClick={() => {
                      setEditingItemId(acc.id)
                      setEditValue(acc.account_name)
                      setEditColor(acc.color_theme || 'slate')
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    aria-label={`Edit ${acc.account_name}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteBank(acc.id, acc.account_name)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${acc.account_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                </div>

              </div>

            )}

          </div>

        ))}

      </div>

    </ModalWrapper>
  )
}