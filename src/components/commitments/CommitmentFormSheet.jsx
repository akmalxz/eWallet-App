// src/components/commitments/CommitmentFormSheet.jsx
import { useState, useEffect, useRef } from 'react'
import { Save, AlertCircle, Wallet } from 'lucide-react'
import { Sheet } from '../shared/Sheet'
import { formatMYR } from '../../utils/formatters'

const NAME_MAX = 40

export const CommitmentFormSheet = ({
  commitment = null,
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

  // ------------------------------------------------------------
  // Empty state — can't add a bill without an active account.
  // Editing an existing bill assumes the account already exists,
  // so this only fires for new bills.
  // ------------------------------------------------------------
  const activeAccounts = accounts.filter(a => !a.is_archived)
  if (!isEdit && activeAccounts.length === 0) {
    return (
      <Sheet
        title="New bill"
        onClose={onCancel}
        saving={saving}
      >
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-surface-2 border border-line rounded-2xl flex items-center justify-center mx-auto mb-4 text-fg-subtle">
            <Wallet className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-fg">No accounts yet</p>
          <p className="text-xs text-fg-subtle mt-1 max-w-[280px] mx-auto leading-relaxed">
            Bills are paid from an account. Add one in{' '}
            <strong className="text-fg-muted">Profile → Bank Accounts</strong>{' '}
            first, then come back here.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="mt-5 w-full py-3 rounded-xl text-sm font-semibold bg-surface-2 text-fg-muted hover:bg-surface-3 transition-colors"
            style={{ minHeight: 44 }}
          >
            Close
          </button>
        </div>
      </Sheet>
    )
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
            className="block text-[11px] font-bold text-fg-subtle uppercase tracking-wider"
          >
            Name
          </label>
          <span
            className={`text-[10px] font-medium ${
              draft.name.length > NAME_MAX ? 'text-danger' : 'text-fg-subtle'
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
          className={`w-full bg-surface border rounded-xl py-3 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors disabled:bg-surface-2 disabled:opacity-70 ${
            errors.name
              ? 'border-danger-border focus:border-danger'
              : 'border-line focus:border-brand'
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-[11px] text-danger font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.name}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="bill-amount"
            className="block text-[11px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5"
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
            className={`w-full bg-surface border rounded-xl py-3 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors disabled:bg-surface-2 disabled:opacity-70 ${
              errors.amount
                ? 'border-danger-border focus:border-danger'
                : 'border-line focus:border-brand'
            }`}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="mt-1 text-[11px] text-danger font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.amount}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="bill-due-day"
            className="block text-[11px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5"
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
            className={`w-full bg-surface border rounded-xl py-3 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors disabled:bg-surface-2 disabled:opacity-70 ${
              errors.dueDay
                ? 'border-danger-border focus:border-danger'
                : 'border-line focus:border-brand'
            }`}
            placeholder="1–31"
          />
        </div>
      </div>

      <p className="text-[11px] text-fg-muted leading-relaxed">
        Bills due on 29–31 fall on the last day in shorter months.
      </p>
      {errors.dueDay && (
        <p className="text-[11px] text-danger font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {errors.dueDay}
        </p>
      )}

      <div>
        <label
          htmlFor="bill-account"
          className="block text-[11px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5"
        >
          Deduct from
        </label>
        <select
          id="bill-account"
          value={draft.accountId}
          onChange={setField('accountId')}
          disabled={saving}
          className={`w-full bg-surface border rounded-xl py-3 px-3 text-sm text-fg outline-none transition-colors disabled:bg-surface-2 disabled:opacity-70 ${
            errors.accountId
              ? 'border-danger-border focus:border-danger'
              : 'border-line focus:border-brand'
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
          <p className="mt-1.5 text-[11px] text-fg-muted">
            Balance:{' '}
            <strong className="text-fg">{formatMYR(account.balance || 0)}</strong>
          </p>
        )}
        {accountIsArchived && (
          <p className="mt-1.5 text-[11px] text-warning-text font-medium">
            This account is archived. Choose a different one.
          </p>
        )}
        {errors.accountId && (
          <p className="mt-1 text-[11px] text-danger font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.accountId}
          </p>
        )}
      </div>

      {serverError && (
        <div className="bg-danger-soft border border-danger-border rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-xs text-danger-text font-medium leading-relaxed">{serverError}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-fg-muted hover:bg-surface-2 transition-colors disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-bold bg-brand-solid hover:bg-brand-solid-hover text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ minHeight: 44 }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add bill'}
        </button>
      </div>
    </Sheet>
  )
}