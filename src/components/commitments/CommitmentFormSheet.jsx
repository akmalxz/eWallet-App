// src/components/commitments/CommitmentFormSheet.jsx
import { useState, useEffect, useRef } from 'react'
import { Save, AlertCircle } from 'lucide-react'
import { Sheet } from '../shared/Sheet'
import { formatMYR } from '../../utils/formatters'

const NAME_MAX = 40

export const CommitmentFormSheet = ({
  commitment = null, // null → add, object → edit
  accounts = [],
  allCommitments = [],
  saving = false,
  onSubmit,
  onCancel
}) => {
  const isEdit = !!commitment
  const nameRef = useRef(null)

  const initial = {
    name: commitment?.name || '',
    amount: commitment?.amount != null ? String(commitment.amount) : '',
    dueDay:
      commitment?.due_day_of_month != null ? String(commitment.due_day_of_month) : '',
    accountId: commitment?.account_id || accounts[0]?.id || ''
  }

  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(initial)

  const account = accounts.find((a) => a.id === draft.accountId)
  const accountIsArchived = account?.is_archived === true

  const validate = () => {
    const next = {}
    const name = draft.name.trim()
    if (!name) next.name = 'Name is required'
    else if (name.length > NAME_MAX)
      next.name = `Name must be ${NAME_MAX} characters or less`
    else {
      const dupe = allCommitments.find(
        (c) => c.id !== commitment?.id && c.name.trim().toLowerCase() === name.toLowerCase()
      )
      if (dupe) next.name = `You already have a bill called "${dupe.name}"`
    }

    const amt = parseFloat(draft.amount)
    if (!draft.amount || isNaN(amt) || amt <= 0) {
      next.amount = 'Enter an amount greater than 0'
    }

    const day = parseInt(draft.dueDay, 10)
    if (!draft.dueDay || isNaN(day) || day < 1 || day > 31) {
      next.dueDay = 'Due day must be between 1 and 31'
    }

    if (!draft.accountId) next.accountId = 'Choose an account'
    else if (accountIsArchived)
      next.accountId = 'This account is archived. Choose another.'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async () => {
    setServerError(null)
    if (!validate()) return

    const payload = {
      name: draft.name.trim(),
      amount: parseFloat(draft.amount),
      due_day_of_month: parseInt(draft.dueDay, 10),
      account_id: draft.accountId
    }

    const result = await onSubmit(payload, commitment)
    if (result && result.success === false) {
      setServerError(result.error || 'Could not save. Please try again.')
    }
  }

  const setField = (field) => (e) => {
    setDraft((d) => ({ ...d, [field]: e.target.value }))
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }))
  }

  return (
    <Sheet
      title={isEdit ? 'Edit bill' : 'New bill'}
      onClose={onCancel}
      saving={saving}
      hasUnsavedChanges={hasChanges}
    >
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="bill-name"
            className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider"
          >
            Name
          </label>
          <span
            className={`text-[10px] font-medium ${
              draft.name.length > NAME_MAX ? 'text-red-500' : 'text-slate-400'
            }`}
          >
            {draft.name.length}/{NAME_MAX}
          </span>
        </div>
        <input
          id="bill-name"
          ref={nameRef}
          type="text"
          value={draft.name}
          onChange={setField('name')}
          maxLength={NAME_MAX + 5}
          placeholder="e.g. Netflix, Rent"
          disabled={saving}
          className={`w-full bg-white border rounded-xl py-3 px-3 text-sm outline-none transition-colors disabled:bg-slate-50 ${
            errors.name ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-[11px] text-red-500 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.name}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="bill-amount"
            className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
          >
            Amount (RM)
          </label>
          <input
            id="bill-amount"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            value={draft.amount}
            onChange={setField('amount')}
            disabled={saving}
            className={`w-full bg-white border rounded-xl py-3 px-3 text-sm outline-none transition-colors disabled:bg-slate-50 ${
              errors.amount ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="mt-1 text-[11px] text-red-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.amount}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="bill-due-day"
            className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
          >
            Due day
          </label>
          <input
            id="bill-due-day"
            type="number"
            min="1"
            max="31"
            inputMode="numeric"
            value={draft.dueDay}
            onChange={setField('dueDay')}
            disabled={saving}
            className={`w-full bg-white border rounded-xl py-3 px-3 text-sm outline-none transition-colors disabled:bg-slate-50 ${
              errors.dueDay ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
            placeholder="1–31"
          />
        </div>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Bills due on 29–31 fall on the last day in shorter months.
      </p>
      {errors.dueDay && (
        <p className="text-[11px] text-red-500 font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {errors.dueDay}
        </p>
      )}

      <div>
        <label
          htmlFor="bill-account"
          className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
        >
          Deduct from
        </label>
        <select
          id="bill-account"
          value={draft.accountId}
          onChange={setField('accountId')}
          disabled={saving}
          className={`w-full bg-white border rounded-xl py-3 px-3 text-sm outline-none transition-colors disabled:bg-slate-50 ${
            errors.accountId ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
          }`}
        >
          <option value="">Select account…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.account_name}
              {a.is_archived ? ' (archived)' : ''}
            </option>
          ))}
        </select>
        {account && !accountIsArchived && (
          <p className="mt-1.5 text-[11px] text-slate-500">
            Balance:{' '}
            <strong className="text-slate-700">{formatMYR(account.balance || 0)}</strong>
          </p>
        )}
        {accountIsArchived && (
          <p className="mt-1.5 text-[11px] text-amber-600 font-medium">
            This account is archived. Choose a different one.
          </p>
        )}
        {errors.accountId && (
          <p className="mt-1 text-[11px] text-red-500 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.accountId}
          </p>
        )}
      </div>

      {serverError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 font-medium leading-relaxed">{serverError}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ minHeight: 44 }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add bill'}
        </button>
      </div>
    </Sheet>
  )
}