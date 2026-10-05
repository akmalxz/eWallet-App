// src/components/dashboard/LedgerEditForm.jsx
import { useState } from 'react'
import { X, Save } from 'lucide-react'

// Build the editable shape from a transaction. Uses the same date
// derivation the old startEdit() used, so the input pre-fills identically.
const initialFormState = (tx) => {
  const raw = tx.transaction_date || tx.created_at
  const dateStr = raw
    ? new Date(raw).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  return {
    description: tx.description || '',
    category: tx.category || '',
    amount: tx.amount || '',
    transaction_date: dateStr,
    source_account_id: tx.source_account_id || '',
    destination_account_id: tx.destination_account_id || ''
  }
}

export const LedgerEditForm = ({
  transaction,
  accounts,
  mainCategories,
  getSubCategories,
  onSave,
  onCancel
}) => {
  const [data, setData] = useState(() => initialFormState(transaction))
  const [errors, setErrors] = useState({})

  const isIncome   = !data.source_account_id && data.destination_account_id
  const isExpense  = data.source_account_id && !data.destination_account_id
  const isTransfer = data.source_account_id && data.destination_account_id

  const setField = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const applyType = (type) => {
    setData((prev) => {
      if (type === 'expense') {
        return { ...prev, source_account_id: accounts[0]?.id || '', destination_account_id: '' }
      }
      if (type === 'income') {
        return { ...prev, source_account_id: '', destination_account_id: accounts[0]?.id || '' }
      }
      return {
        ...prev,
        source_account_id: accounts[0]?.id || '',
        destination_account_id: accounts[1]?.id || accounts[0]?.id || ''
      }
    })
    setErrors((prev) => ({ ...prev, accounts: '' }))
  }

  const validate = () => {
    const next = {}

    if (!data.description || data.description.trim().length < 2) {
      next.description = 'Description must be at least 2 characters'
    }

    if (!data.category || data.category === 'uncategorized') {
      next.category = 'Please select a category'
    }

    const amountNum = parseFloat(data.amount)
    if (!data.amount || isNaN(amountNum) || amountNum <= 0) {
      next.amount = 'Please enter a valid amount greater than 0'
    }

    if (!isIncome && !isExpense && !isTransfer) {
      next.accounts = 'Please select at least one account'
    } else if (isTransfer && data.source_account_id === data.destination_account_id) {
      next.accounts = 'Source and destination accounts must be different'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const amountNum = parseFloat(data.amount)
    onSave({
      description: data.description.trim(),
      category: data.category,
      amount: Math.abs(amountNum),
      transaction_date: data.transaction_date,
      source_account_id: data.source_account_id || null,
      destination_account_id: data.destination_account_id || null,
      transaction_type: isIncome ? 'income' : isExpense ? 'expense' : 'transfer'
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="bg-surface-2/50 p-4 space-y-4 animate-fadeIn">
      <div className="flex justify-between items-center border-b border-line pb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
          Editing
        </span>
        <button
          onClick={onCancel}
          className="w-11 h-11 flex items-center justify-center text-fg-subtle hover:text-fg-muted rounded-lg"
          aria-label="Cancel editing"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5">
          Description
        </label>
        <input
          type="text"
          value={data.description}
          onChange={(e) => setField('description', e.target.value)}
          onKeyDown={handleKeyDown}
          className={`w-full bg-surface border ${
            errors.description
              ? 'border-danger-border focus:border-danger'
              : 'border-line focus:border-brand'
          } rounded-xl px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-2 focus:ring-brand/30 transition-all`}
          placeholder="Description"
        />
        {errors.description && (
          <p className="mt-1 text-[11px] text-danger font-medium">
            {errors.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5">
            Date
          </label>
          <input
            type="date"
            value={data.transaction_date}
            onChange={(e) => setField('transaction_date', e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-surface border border-line focus:border-brand rounded-xl px-3 py-2.5 text-sm text-fg outline-none focus:ring-2 focus:ring-brand/30 transition-all"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5">
            Amount (RM)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={data.amount}
            onChange={(e) => setField('amount', e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-full bg-surface border ${
              errors.amount
                ? 'border-danger-border focus:border-danger'
                : 'border-line focus:border-brand'
            } rounded-xl px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-2 focus:ring-brand/30 transition-all`}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="mt-1 text-[11px] text-danger font-medium">
              {errors.amount}
            </p>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5">
            Category
          </label>
          <select
            value={data.category}
            onChange={(e) => setField('category', e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-full bg-surface border ${
              errors.category
                ? 'border-danger-border focus:border-danger'
                : 'border-line focus:border-brand'
            } rounded-xl px-3 py-2.5 text-sm text-fg outline-none focus:ring-2 focus:ring-brand/30 transition-all`}
          >
            <option value="">Select category...</option>
            {mainCategories.map((main) => (
              <optgroup key={main.id} label={main.name}>
                {getSubCategories(main.id).map((sub) => (
                  <option key={sub.id} value={`${main.name} > ${sub.name}`}>
                    {sub.name}
                  </option>
                ))}
                {getSubCategories(main.id).length === 0 && (
                  <option value={main.name}>{main.name}</option>
                )}
              </optgroup>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-[11px] text-danger font-medium">
              {errors.category}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5">
          Transaction Type
        </label>
        <div className="flex gap-1.5 bg-surface-2/60 p-1 rounded-xl border border-line">
          <button
            type="button"
            onClick={() => applyType('expense')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isExpense
                ? 'bg-danger-soft text-danger-text border border-danger-border'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => applyType('income')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isIncome
                ? 'bg-success-soft text-success-text border border-success-border'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => applyType('transfer')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isTransfer
                ? 'bg-info-soft text-info-text border border-info-border'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Transfer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {isExpense || isTransfer ? (
          <div>
            <label className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5">
              {isExpense ? 'Pay From' : 'From'}
            </label>
            <select
              value={data.source_account_id}
              onChange={(e) => setField('source_account_id', e.target.value)}
              className="w-full bg-surface border border-line focus:border-brand rounded-xl px-3 py-2.5 text-sm text-fg outline-none focus:ring-2 focus:ring-brand/30 transition-all"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5">
              Source
            </label>
            <select
              value=""
              disabled
              className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-sm text-fg-subtle cursor-not-allowed"
            >
              <option value="">None Required</option>
            </select>
          </div>
        )}

        {isIncome || isTransfer ? (
          <div>
            <label className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5">
              {isIncome ? 'Deposit To' : 'To'}
            </label>
            <select
              value={data.destination_account_id}
              onChange={(e) => setField('destination_account_id', e.target.value)}
              className="w-full bg-surface border border-line focus:border-brand rounded-xl px-3 py-2.5 text-sm text-fg outline-none focus:ring-2 focus:ring-brand/30 transition-all"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5">
              Destination
            </label>
            <select
              value=""
              disabled
              className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-sm text-fg-subtle cursor-not-allowed"
            >
              <option value="">None Required</option>
            </select>
          </div>
        )}
      </div>

      {errors.accounts && (
        <p className="text-[11px] text-danger font-medium">{errors.accounts}</p>
      )}

      <div className="flex gap-2 justify-end pt-2 border-t border-line">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-xs font-semibold text-fg-muted hover:bg-surface-2 rounded-xl transition-all"
          style={{ minHeight: 44 }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2.5 text-xs font-bold bg-brand-solid hover:bg-brand-solid-hover text-white rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md"
          style={{ minHeight: 44 }}
        >
          <Save className="w-3.5 h-3.5" /> Save Changes
        </button>
      </div>
    </div>
  )
}