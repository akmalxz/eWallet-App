// src/pages/LogItemPage.jsx
import { useState, useEffect, useMemo } from 'react'
import { PlusCircle, AlertCircle, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { SlidingSegmentedControl } from '../components/shared/SlidingSegmentedControl'

const TX_TYPE_ITEMS = [
  { id: 'expense',  label: 'Expense' },
  { id: 'income',   label: 'Income' },
  { id: 'transfer', label: 'Transfer' }
]

export function LogItemPage({
  user,
  accounts,
  onAddAccount,
  mainCategories,
  getSubCategories,
  fetchAllData,
  showToast
}) {
  const [txType, setTxType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [category, setCategory] = useState('uncategorized')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [source, setSource] = useState(accounts[0]?.id || '')
  const [dest, setDest] = useState(accounts[1]?.id || accounts[0]?.id || '')
  const [saving, setSaving] = useState(false)

  const incomeCategory = useMemo(
    () => mainCategories.find(c => c.name.toLowerCase() === 'income'),
    [mainCategories]
  )

  const expenseCategories = useMemo(
    () => mainCategories.filter(c => c.name.toLowerCase() !== 'income'),
    [mainCategories]
  )

  useEffect(() => {
    setCategory('uncategorized')
  }, [txType])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const finalCategory =
        txType === 'transfer' ? 'Transfer' : (category || 'uncategorized')

      const payload = {
        user_id: user.id,
        description: desc || 'Manual Entry',
        amount: Math.abs(parseFloat(amount)),
        category: finalCategory,
        transaction_date: new Date(`${txDate}T12:00:00`).toISOString(),
        source_account_id: txType === 'income' ? null : source,
        destination_account_id: txType === 'expense'
          ? null
          : (txType === 'income' ? source : dest)
      }
      const { error } = await supabase.from('transactions').insert([payload])
      if (error) throw error

      showToast('Transaction logged successfully!', 'success')
      setAmount('')
      setDesc('')
      setCategory('uncategorized')
      fetchAllData()
    } catch (error) {
      showToast('Error saving transaction: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const showCategory = txType !== 'transfer'

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

  const categoryHint = () => {
    if (txType === 'income') {
      if (!incomeCategory) return 'Set up income categories in Settings first.'
      return null
    }
    if (txType === 'expense' && expenseCategories.length === 0) {
      return 'Set up expense categories in Settings first.'
    }
    return null
  }

  const hint = categoryHint()

  // ------------------------------------------------------------
  // Empty state — no accounts, can't log anything.
  // Rendering the form in this state would let the user submit
  // with empty account IDs and hit a DB constraint error.
  // ------------------------------------------------------------
  if (!accounts || accounts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        <div className="hidden md:block mb-5 px-1">
          <h1 className="text-xl font-bold text-fg tracking-tight">Manual Entry</h1>
          <p className="text-xs text-fg-subtle mt-1">Record a new income, expense, or transfer</p>
        </div>

        <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-surface-2 border border-line rounded-2xl flex items-center justify-center mx-auto mb-4 text-fg-subtle">
            <Wallet className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-fg">No accounts yet</p>
          <p className="text-xs text-fg-subtle mt-1 max-w-[280px] mx-auto leading-relaxed">
            Every transaction needs an account. Add your first one to get started.
          </p>
          {onAddAccount && (
            <button
              type="button"
              onClick={onAddAccount}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-brand-solid hover:bg-brand-solid-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              style={{ minHeight: 44 }}
            >
              <PlusCircle className="w-4 h-4" /> Add Account
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* Page Header */}
      <div className="hidden md:block mb-5 px-1">
        <h1 className="text-xl font-bold text-fg tracking-tight">Manual Entry</h1>
        <p className="text-xs text-fg-subtle mt-1">Record a new income, expense, or transfer</p>
      </div>

      <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl overflow-hidden shadow-sm p-5">

        <div className="flex items-center gap-4 mb-5">
          <div className="p-2.5 rounded-xl bg-brand-solid text-white shadow-md">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="font-bold text-base text-fg">Log New Expense</span>
        </div>

        {/* Segmented type controller — shared sliding pill */}
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
              <label htmlFor="tx-date" className="block text-xs font-bold text-fg-subtle uppercase mb-1">Date</label>
              <input
                id="tx-date"
                name="tx-date"
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-xs sm:text-sm text-fg transition-all"
              />
            </div>
            <div>
              <label htmlFor="tx-amount" className="block text-xs font-bold text-fg-subtle uppercase mb-1">Amount</label>
              <input
                id="tx-amount"
                name="tx-amount"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-sm text-fg placeholder:text-fg-subtle transition-all"
                placeholder="0.00"
              />
            </div>

            {showCategory && (
              <div>
                <label htmlFor="tx-category" className="block text-xs font-bold text-fg-subtle uppercase mb-1">
                  Category
                </label>
                <select
                  id="tx-category"
                  name="tx-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-sm text-fg transition-all"
                >
                  <option value="uncategorized">Select...</option>
                  {renderCategoryTree()}
                </select>
                {hint && (
                  <p className="text-[10px] text-warning-text mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {hint}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="tx-desc" className="block text-xs font-bold text-fg-subtle uppercase mb-1">Description</label>
            <input
              id="tx-desc"
              name="tx-desc"
              type="text"
              required
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-fg placeholder:text-fg-subtle transition-all"
              placeholder={
                txType === 'transfer'
                  ? 'e.g. Move to savings'
                  : txType === 'income'
                    ? 'e.g. Salary, Side hustle'
                    : 'e.g. Lunch at Nasi Kandar'
              }
            />
          </div>

          {txType !== 'transfer' ? (
            <div>
              <label htmlFor="tx-source" className="block text-xs font-bold text-fg-subtle uppercase mb-1">
                {txType === 'income' ? 'Deposit To' : 'Pay From'}
              </label>
              <select
                id="tx-source"
                name="tx-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-fg transition-all"
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="tx-transfer-from" className="block text-xs font-bold text-fg-subtle uppercase mb-1">From</label>
                <select
                  id="tx-transfer-from"
                  name="tx-transfer-from"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-fg transition-all"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="tx-transfer-to" className="block text-xs font-bold text-fg-subtle uppercase mb-1">To</label>
                <select
                  id="tx-transfer-to"
                  name="tx-transfer-to"
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-fg transition-all"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white font-medium py-3 rounded-xl mt-4 transition-colors disabled:opacity-50"
            style={{ minHeight: 44 }}
          >
            {saving ? 'Saving...' : 'Log Transaction'}
          </button>
        </form>
      </div>

    </div>
  )
}