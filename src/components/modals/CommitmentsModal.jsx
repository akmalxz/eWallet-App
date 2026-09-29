// src/components/modals/CommitmentsModal.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Plus, CheckCircle, PauseCircle, Trash2, X, Edit2, Save } from 'lucide-react'
import { ModalWrapper } from './ModalWrapper'
import { formatMYR } from '../../utils/formatters'

export const CommitmentsModal = ({
  user,
  accounts,
  commitments,
  closeModal,
  fetchAllData,
  showToast
}) => {
  const [newCommitmentName, setNewCommitmentName] = useState('')
  const [newCommitmentAmount, setNewCommitmentAmount] = useState('')
  const [newCommitmentDueDay, setNewCommitmentDueDay] = useState('')
  const [newCommitmentAccount, setNewCommitmentAccount] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAddCommitment, setShowAddCommitment] = useState(false)

  // ----------------------------------------------------------
  // EDIT STATE
  // ----------------------------------------------------------
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDueDay, setEditDueDay] = useState('')
  const [editAccount, setEditAccount] = useState('')

  // ----------------------------------------------------------
  // Add handlers
  // ----------------------------------------------------------

  const handleAddCommitment = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('commitments')
        .insert([
          {
            user_id: user.id,
            name: newCommitmentName.trim(),
            amount: parseFloat(newCommitmentAmount),
            due_day_of_month: parseInt(newCommitmentDueDay),
            account_id: newCommitmentAccount,
            is_active: true
          }
        ])

      if (error) throw error

      setNewCommitmentName('')
      setNewCommitmentAmount('')
      setNewCommitmentDueDay('')
      setNewCommitmentAccount('')

      showToast('Commitment added!', 'success')
      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // ----------------------------------------------------------
  // Edit handlers
  // ----------------------------------------------------------

  const startEdit = (comm) => {
    setEditingId(comm.id)
    setEditName(comm.name || '')
    setEditAmount(comm.amount != null ? String(comm.amount) : '')
    setEditDueDay(comm.due_day_of_month != null ? String(comm.due_day_of_month) : '')
    setEditAccount(comm.account_id || '')
    setShowAddCommitment(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditAmount('')
    setEditDueDay('')
    setEditAccount('')
  }

  const handleUpdateCommitment = async (id) => {
    if (!editName.trim()) {
      showToast('Commitment name is required', 'warning')
      return
    }

    const amountNum = parseFloat(editAmount)
    if (!editAmount || isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid amount', 'warning')
      return
    }

    const dayNum = parseInt(editDueDay)
    if (!editDueDay || isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      showToast('Due day must be between 1 and 31', 'warning')
      return
    }

    if (!editAccount) {
      showToast('Please select an account', 'warning')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('commitments')
        .update({
          name: editName.trim(),
          amount: amountNum,
          due_day_of_month: dayNum,
          account_id: editAccount
        })
        .eq('id', id)

      if (error) throw error

      showToast('Commitment updated successfully', 'success')
      fetchAllData()
      cancelEdit()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // ----------------------------------------------------------
  // Delete / Toggle handlers
  // ----------------------------------------------------------

  const handleDeleteCommitment = async (id, name) => {
    if (!window.confirm(`Delete commitment "${name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('commitments')
        .delete()
        .eq('id', id)

      if (error) throw error

      showToast('Commitment deleted', 'success')
      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  const handleToggleCommitment = async (id, isActive) => {
    try {
      const { error } = await supabase
        .from('commitments')
        .update({ is_active: !isActive })
        .eq('id', id)

      if (error) throw error

      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <ModalWrapper title="Commitments" closeModal={closeModal}>

      <div className="space-y-3">

        {/* Top Actions Row */}
        <button
          onClick={() => {
            setShowAddCommitment(!showAddCommitment)
            cancelEdit()
          }}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm border ${
            showAddCommitment
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
          }`}
          aria-label="Add new commitment"
        >
          {showAddCommitment ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAddCommitment ? 'Cancel' : 'Add New Commitment'}
        </button>

        {/* New Commitment Inline Form */}
        {showAddCommitment && (
          <form
            onSubmit={(e) => {
              handleAddCommitment(e);
              setShowAddCommitment(false);
            }}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-fadeIn"
          >
            <label htmlFor="comm-name" className="sr-only">
              Commitment Name
            </label>

            <input
              id="comm-name"
              name="comm-name"
              autoFocus
              type="text"
              required
              value={newCommitmentName}
              onChange={(e) => setNewCommitmentName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500"
              placeholder="e.g. Netflix, Rent"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="comm-amount" className="sr-only">
                  Amount
                </label>
                <input
                  id="comm-amount"
                  name="comm-amount"
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={newCommitmentAmount}
                  onChange={(e) => setNewCommitmentAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Amount"
                />
              </div>

              <div>
                <label htmlFor="comm-day" className="sr-only">
                  Due Day
                </label>
                <input
                  id="comm-day"
                  name="comm-day"
                  type="number"
                  required
                  min="1"
                  max="31"
                  value={newCommitmentDueDay}
                  onChange={(e) => setNewCommitmentDueDay(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Due day (1-31)"
                />
              </div>
            </div>

            <label htmlFor="comm-account" className="sr-only">
              Deduction Account
            </label>

            <select
              id="comm-account"
              name="comm-account"
              required
              value={newCommitmentAccount}
              onChange={(e) => setNewCommitmentAccount(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Select deduct account...</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg text-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Commitment'}
            </button>
          </form>
        )}


        {/* Existing commitments list */}
        {commitments.length === 0 ? (

          <p className="text-sm text-slate-500 text-center py-4">
            No fixed commitments tracked yet.
          </p>

        ) : (

          commitments.map(comm => {
            const isEditingThis = editingId === comm.id

            return (
              <div
                key={comm.id}
                className={`rounded-xl border transition-colors ${
                  isEditingThis
                    ? 'bg-slate-50 border-slate-200'
                    : comm.is_active
                      ? 'bg-white/50 border-white/60'
                      : 'bg-slate-50/30 border-white/20 opacity-60'
                }`}
              >

                {/* ============ EDITING MODE ============ */}
                {isEditingThis ? (
                  <div className="p-3 space-y-3">

                    {/* Header row with cancel X */}
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Edit2 className="h-3 w-3" /> Editing Mode
                      </span>
                      <button
                        onClick={cancelEdit}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        aria-label="Cancel editing"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div>
                      <label
                        htmlFor={`edit-name-${comm.id}`}
                        className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                      >
                        Name
                      </label>
                      <input
                        id={`edit-name-${comm.id}`}
                        type="text"
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500"
                        placeholder="e.g. Netflix, Rent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor={`edit-amount-${comm.id}`}
                          className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                        >
                          Amount
                        </label>
                        <input
                          id={`edit-amount-${comm.id}`}
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500"
                          placeholder="Amount"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`edit-day-${comm.id}`}
                          className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                        >
                          Due Day
                        </label>
                        <input
                          id={`edit-day-${comm.id}`}
                          type="number"
                          min="1"
                          max="31"
                          value={editDueDay}
                          onChange={(e) => setEditDueDay(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500"
                          placeholder="1-31"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor={`edit-account-${comm.id}`}
                        className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                      >
                        Deduct Account
                      </label>
                      <select
                        id={`edit-account-${comm.id}`}
                        value={editAccount}
                        onChange={(e) => setEditAccount(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="">Select deduct account...</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.account_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateCommitment(comm.id)}
                        disabled={saving}
                        className="px-3 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>

                  </div>

                ) : (

                /* ============ VIEW MODE ============ */
                <div className="flex justify-between items-center p-3">

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {comm.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatMYR(comm.amount)} on day {comm.due_day_of_month}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">

                    <button
                      onClick={() => handleToggleCommitment(comm.id, comm.is_active)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        comm.is_active
                          ? 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600'
                          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                      }`}
                      title={comm.is_active ? 'Deactivate' : 'Activate'}
                      aria-label={
                        comm.is_active
                          ? 'Deactivate commitment'
                          : 'Activate commitment'
                      }
                    >
                      {comm.is_active ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <PauseCircle className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      onClick={() => startEdit(comm)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                      aria-label={`Edit ${comm.name}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteCommitment(comm.id, comm.name)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${comm.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                  </div>

                </div>

                )}

              </div>
            )
          })

        )}

      </div>

    </ModalWrapper>
  )
}