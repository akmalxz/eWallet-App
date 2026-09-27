// src/pages/LogItemPage.jsx
import { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export function LogItemPage({
  user, accounts, mainCategories, getSubCategories, fetchAllData, showToast
}) {
  // Form State
  const [txType, setTxType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [category, setCategory] = useState('uncategorized')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [source, setSource] = useState(accounts[0]?.id || '')
  const [dest, setDest] = useState(accounts[0]?.id || '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        user_id: user.id,
        description: desc || 'Manual Entry',
        amount: Math.abs(parseFloat(amount)),
        category,
        transaction_date: new Date(`${txDate}T12:00:00`).toISOString(),
        source_account_id: txType === 'income' ? null : source,
        destination_account_id: txType === 'expense' ? null : (txType === 'income' ? source : dest)
      }
      const { error } = await supabase.from('transactions').insert([payload])
      if (error) throw error

      showToast('Transaction logged successfully!', 'success')
      setAmount('')
      setDesc('')
      fetchAllData()
    } catch (error) {
      showToast('Error saving transaction: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* Page Header */}
      <div className="hidden md:block mb-5 px-1">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Manual Entry</h1>
        <p className="text-xs text-slate-400 mt-1">Record a new income, expense, or transfer</p>
      </div>

      {/* SECTION 2: LOG NEW EXPENSES */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl overflow-hidden shadow-sm p-5">

        <div className="flex items-center gap-4 mb-5">
          <div className="p-2.5 rounded-xl bg-blue-500 text-white shadow-md">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="font-bold text-base text-slate-800">Log New Expense</span>
        </div>

        {/* Segmented Type Controller */}
        <div className="flex p-1 mb-6 bg-slate-100/80 backdrop-blur-md rounded-xl shadow-inner border border-slate-200/50 relative">
          {['expense', 'income', 'transfer'].map((t) => (
            <button
              key={t}
              onClick={(e) => {
                e.preventDefault()
                setTxType(t)
              }}
              className={`flex-1 py-2 text-sm font-bold capitalize rounded-lg transition-all duration-300 z-10 ${
                txType === t
                  ? 'text-slate-800 shadow-sm bg-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="tx-date" className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
              <input
                id="tx-date"
                name="tx-date"
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm transition-all"
              />
            </div>
            <div>
              <label htmlFor="tx-amount" className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
              <input
                id="tx-amount"
                name="tx-amount"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="tx-category" className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
              <select
                id="tx-category"
                name="tx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
              >
                <option value="uncategorized">Select...</option>
                {mainCategories.map(main => (
                  <optgroup key={main.id} label={main.name}>
                    {getSubCategories(main.id).map(sub => (
                      <option key={sub.id} value={`${main.name} > ${sub.name}`}>{sub.name}</option>
                    ))}
                    {getSubCategories(main.id).length === 0 && (
                      <option value={main.name}>{main.name} (General)</option>
                    )}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="tx-desc" className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
            <input
              id="tx-desc"
              name="tx-desc"
              type="text"
              required
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="e.g. Salary, Lunch at Nasi Kandar"
            />
          </div>

          {txType !== 'transfer' ? (
            <div>
              <label htmlFor="tx-source" className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {txType === 'income' ? 'Deposit To' : 'Pay From'}
              </label>
              <select
                id="tx-source"
                name="tx-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="tx-transfer-from" className="block text-xs font-bold text-slate-500 uppercase mb-1">From</label>
                <select
                  id="tx-transfer-from"
                  name="tx-transfer-from"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="tx-transfer-to" className="block text-xs font-bold text-slate-500 uppercase mb-1">To</label>
                <select
                  id="tx-transfer-to"
                  name="tx-transfer-to"
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl mt-4 transition-colors"
          >
            {saving ? 'Saving...' : 'Log Transaction'}
          </button>
        </form>
      </div>

    </div>
  )
}