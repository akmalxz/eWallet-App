// src/components/transactions/TransactionForm.jsx
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  AlertCircle, Loader2, ChevronDown,
  ArrowUpRight, ArrowDownRight, ArrowRight,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { SlidingSegmentedControl } from '../shared/SlidingSegmentedControl'
import { validateTransaction } from '../../utils/transactions/validateTransaction'

const TX_TYPE_ITEMS = [
  { id: 'expense',  label: 'Expense' },
  { id: 'income',   label: 'Income' },
  { id: 'transfer', label: 'Transfer' },
]

const TYPE_ICON = {
  expense:  ArrowDownRight,
  income:   ArrowUpRight,
  transfer: ArrowRight,
}

const TYPE_COLOR = {
  expense:  'text-fg-muted',
  income:   'text-fg-muted',
  transfer: 'text-fg-muted',
}

const HEADER_LABEL = {
  expense:  'Log New Expense',
  income:   'Log New Income',
  transfer: 'Log New Transfer',
}

export function TransactionForm({
  user,
  accounts = [],
  mainCategories = [],
  getSubCategories,
  fetchAccounts,
  fetchRecentTransactions,
  fetchMonthlyData,
  showToast,
  onSuccess,                 
  onCancel,                  
  submitLabel = 'Log Transaction',
  initialAccountId,          
}) {
  const [txType, setTxType] = useState('expense')
  const [rawAmount, setRawAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('uncategorized')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [source, setSource] = useState(initialAccountId || accounts[0]?.id || '')
  const [dest, setDest] = useState(accounts[1]?.id || accounts[0]?.id || '')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const amountRef = useRef(null)
  const descriptionRef = useRef(null)

  // Format raw digits (e.g., "1234") into "12.34"
  const displayAmount = rawAmount ? (Number(rawAmount) / 100).toFixed(2) : ''

  useEffect(() => {
    const timer = setTimeout(() => {
      amountRef.current?.focus({ preventScroll: true })
    }, 200)
    
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!accounts.length) return
    const defaultSource = initialAccountId || accounts[0].id
    const defaultDest = accounts.length > 1 ? accounts[1].id : accounts[0].id
    setSource(prev => prev || defaultSource)
    setDest(prev => prev || defaultDest)
  }, [accounts, initialAccountId])

  useEffect(() => {
    setCategory('uncategorized')
    setErrors({})
  }, [txType])

  const incomeCategory = useMemo(
    () => mainCategories.find(c => c.name.toLowerCase() === 'income'),
    [mainCategories]
  )

  const expenseCategories = useMemo(
    () => mainCategories.filter(c => c.name.toLowerCase() !== 'income'),
    [mainCategories]
  )

  const showCategory = txType !== 'transfer'

  const clearError = (field) => {
    if (!errors[field]) return
    setErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleAmountChange = (e) => {
    // Strip all non-digit characters (e.g., if they type a dot or comma)
    const digits = e.target.value.replace(/\D/g, '')
    // Prevent absurdly large numbers (over ~10 million)
    if (digits.length <= 10) {
      setRawAmount(digits)
      clearError('amount')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const draft = {
      txType,
      amount: displayAmount,
      description,
      category,
      sourceAccount: source,
      destAccount: dest,
    }
    const validationErrors = validateTransaction(draft)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      const firstKey = Object.keys(validationErrors)[0]
      if (firstKey === 'amount') amountRef.current?.focus()
      if (firstKey === 'description') descriptionRef.current?.focus()
      return
    }

    setSaving(true)
    try {
      const amountNum = Number(rawAmount) / 100
      const finalCategory = txType === 'transfer' ? 'Transfer' : category

      const payload = {
        user_id: user.id,
        description: description.trim() || 'Manual Entry',
        amount: amountNum,
        category: finalCategory,
        transaction_date: new Date(`${txDate}T12:00:00`).toISOString(),
        source_account_id: txType === 'income' ? null : source,
        destination_account_id:
          txType === 'expense' ? null : (txType === 'income' ? source : dest),
        needs_review: false,
      }

      const { error } = await supabase.from('transactions').insert([payload])
      if (error) throw error

      showToast('Transaction logged successfully!', 'success')

      setRawAmount('')
      setDescription('')
      setCategory('uncategorized')
      setErrors({})
      
      window.scrollTo({ top: 0, behavior: 'smooth' })
      amountRef.current?.focus()

      if (onSuccess) onSuccess(payload.description)
      
      await Promise.all([
        fetchRecentTransactions(),
        fetchAccounts(),
        fetchMonthlyData()
      ])
      
    } catch (err) {
      showToast('Error saving transaction: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const renderCategoryTree = () => {
    if (txType === 'income') {
      if (!incomeCategory) {
        return (
          <option value="uncategorized" disabled>
            No income categories yet — create one in Settings
          </option>
        )
      }
      const subs = getSubCategories(incomeCategory.id)
      if (subs.length === 0) {
        return <option value={incomeCategory.name}>{incomeCategory.name}</option>
      }
      return (
        <optgroup label={incomeCategory.name}>
          {subs.map(sub => (
            <option key={sub.id} value={`${incomeCategory.name} > ${sub.name}`}>
              {sub.name}
            </option>
          ))}
        </optgroup>
      )
    }

    if (expenseCategories.length === 0) {
      return (
        <option value="uncategorized" disabled>
          No expense categories yet — create one in Settings
        </option>
      )
    }
    return expenseCategories.map(main => {
      const subs = getSubCategories(main.id)
      return (
        <optgroup key={main.id} label={main.name}>
          {subs.map(sub => (
            <option key={sub.id} value={`${main.name} > ${sub.name}`}>
              {sub.name}
            </option>
          ))}
          {subs.length === 0 && (
            <option value={main.name}>{main.name} (General)</option>
          )}
        </optgroup>
      )
    })
  }

  const TypeIcon = TYPE_ICON[txType]
  const typeColor = TYPE_COLOR[txType]

  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <div className={`p-2.5 rounded-xl bg-surface-2 ${typeColor}`}>
          <TypeIcon className="w-5 h-5" />
        </div>
        <span className="font-bold text-base text-fg">{HEADER_LABEL[txType]}</span>
      </div>

      <div className="mb-6">
        <SlidingSegmentedControl
          items={TX_TYPE_ITEMS}
          value={txType}
          onChange={setTxType}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className={`grid gap-3 ${
          showCategory ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
        }`}>
          
          <div>
            <label htmlFor="tx-date" className="block text-xs font-bold text-fg-subtle uppercase mb-1">
              Date
            </label>
            <input
              id="tx-date"
              name="tx-date"
              type="date"
              required
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="w-full h-[46px] bg-surface border border-line-strong rounded-xl py-2 px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-sm text-fg transition-all appearance-none"
            />
          </div>

          <div>
            <label htmlFor="tx-amount" className="block text-xs font-bold text-fg-subtle uppercase mb-1">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle text-sm font-medium pointer-events-none">
                RM
              </span>
              <input
                ref={amountRef}
                id="tx-amount"
                name="tx-amount"
                type="text"
                inputMode="numeric"
                required
                value={displayAmount}
                onChange={handleAmountChange}
                className={`w-full h-[46px] bg-surface border ${
                  errors.amount
                    ? 'border-danger-border focus:border-danger'
                    : 'border-line-strong focus:border-brand'
                } rounded-xl py-2 pl-9 pr-3 text-sm font-bold text-fg placeholder:text-fg-subtle placeholder:font-normal outline-none focus:ring-2 focus:ring-brand/30 transition-all tabular-figures`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-[11px] text-danger flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> {errors.amount}
              </p>
            )}
          </div>

          {showCategory && (
            <div>
              <label htmlFor="tx-category" className="block text-xs font-bold text-fg-subtle uppercase mb-1">
                Category
              </label>
              <div className="relative">
                <select
                  id="tx-category"
                  name="tx-category"
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); clearError('category') }}
                  className={`w-full h-[46px] bg-surface border ${
                    errors.category
                      ? 'border-danger-border focus:border-danger'
                      : 'border-line-strong focus:border-brand'
                  } rounded-xl py-2 pl-3 pr-10 text-sm text-fg outline-none focus:ring-2 focus:ring-brand/30 transition-all appearance-none`}
                >
                  <option value="uncategorized">Select...</option>
                  {renderCategoryTree()}
                </select>
                <ChevronDown className="w-4 h-4 text-fg-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {errors.category && (
                <p className="mt-1 text-[11px] text-danger flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {errors.category}
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="tx-desc" className="block text-xs font-bold text-fg-subtle uppercase mb-1">
            Description
          </label>
          <input
            ref={descriptionRef}
            id="tx-desc"
            name="tx-desc"
            type="text"
            required
            value={description}
            onChange={(e) => { setDescription(e.target.value); clearError('description') }}
            className={`w-full h-[46px] bg-surface border ${
              errors.description
                ? 'border-danger-border focus:border-danger'
                : 'border-line-strong focus:border-brand'
            } rounded-xl py-2 px-3 text-fg placeholder:text-fg-subtle outline-none focus:ring-2 focus:ring-brand/30 transition-all`}
            placeholder={
              txType === 'transfer'
                ? 'e.g. Move to savings'
                : txType === 'income'
                  ? 'e.g. Salary, Side hustle'
                  : 'e.g. Lunch at Nasi Kandar'
            }
          />
          {errors.description && (
            <p className="mt-1 text-[11px] text-danger flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" /> {errors.description}
            </p>
          )}
        </div>

        {txType !== 'transfer' ? (
          <div>
            <label htmlFor="tx-source" className="block text-xs font-bold text-fg-subtle uppercase mb-1">
              {txType === 'income' ? 'Deposit To' : 'Pay From'}
            </label>
            <div className="relative">
              <select
                id="tx-source"
                name="tx-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full h-[46px] bg-surface border border-line-strong rounded-xl py-2 pl-3 pr-10 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-fg transition-all appearance-none"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.account_name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-fg-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tx-transfer-from" className="block text-xs font-bold text-fg-subtle uppercase mb-1">
                From
              </label>
              <div className="relative">
                <select
                  id="tx-transfer-from"
                  value={source}
                  onChange={(e) => { setSource(e.target.value); clearError('source') }}
                  className={`w-full h-[46px] bg-surface border ${
                    errors.source
                      ? 'border-danger-border focus:border-danger'
                      : 'border-line-strong focus:border-brand'
                  } rounded-xl py-2 pl-3 pr-10 text-fg outline-none focus:ring-2 focus:ring-brand/30 transition-all appearance-none`}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.account_name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-fg-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div>
              <label htmlFor="tx-transfer-to" className="block text-xs font-bold text-fg-subtle uppercase mb-1">
                To
              </label>
              <div className="relative">
                <select
                  id="tx-transfer-to"
                  value={dest}
                  onChange={(e) => { setDest(e.target.value); clearError('dest') }}
                  className={`w-full h-[46px] bg-surface border ${
                    errors.dest
                      ? 'border-danger-border focus:border-danger'
                      : 'border-line-strong focus:border-brand'
                  } rounded-xl py-2 pl-3 pr-10 text-fg outline-none focus:ring-2 focus:ring-brand/30 transition-all appearance-none`}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.account_name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-fg-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {onCancel ? (
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-surface-2 border border-line hover:bg-surface-3 text-fg-muted font-medium py-3 rounded-xl transition-colors text-sm"
              style={{ minHeight: 44 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-brand-solid hover:bg-brand-solid-hover text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              style={{ minHeight: 44 }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : submitLabel}
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white font-medium py-3 rounded-xl mt-6 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ minHeight: 44 }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : submitLabel}
          </button>
        )}
      </form>
    </div>
  )
}