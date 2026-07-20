// src/components/modals/ManualTransactionModal.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { X, ArrowUpRight, ArrowDownRight, ArrowRight, Check, AlertCircle } from 'lucide-react'

export const ManualTransactionModal = ({ 
  setIsOpen, 
  user, 
  accounts, 
  categories,
  getSubCategories, 
  fetchAllData, 
  showToast,
  selectedAccount
}) => {
  // Form state
  const [txType, setTxType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [sourceAccount, setSourceAccount] = useState('')
  const [destAccount, setDestAccount] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  
  // Focus management
  const amountInputRef = useRef(null)
  const descriptionInputRef = useRef(null)

  // ============================================
  // CATEGORY HIERARCHY - Get from ALL categories
  // ============================================
  const mainCategories = useMemo(() => {
    return categories.filter(c => !c.parent_id)
  }, [categories])

  const filteredMainCategories = useMemo(() => {
    if (txType === 'income') {
      const incomeKeywords = ['income', 'salary', 'bonus', 'pay', 'paycheck', 'received', 'deposit', 'refund']
      return mainCategories.filter(main => 
        incomeKeywords.some(keyword => 
          main.name.toLowerCase().includes(keyword) ||
          (main.keywords && main.keywords.some(k => incomeKeywords.includes(k.toLowerCase())))
        )
      )
    }
    return mainCategories
  }, [mainCategories, txType])

  const getFilteredSubCategories = useCallback((parentId) => {
    const subs = categories.filter(c => c.parent_id === parentId)
    if (txType === 'income') {
      const incomeKeywords = ['income', 'salary', 'bonus', 'pay', 'paycheck', 'received', 'deposit', 'refund']
      return subs.filter(sub => 
        incomeKeywords.some(keyword => 
          sub.name.toLowerCase().includes(keyword) ||
          (sub.keywords && sub.keywords.some(k => incomeKeywords.includes(k.toLowerCase())))
        )
      )
    }
    return subs
  }, [categories, txType])

  // Auto-focus amount on mount
  useEffect(() => {
    if (amountInputRef.current) {
      amountInputRef.current.focus()
    }
  }, [])

  // Reset form when modal opens or type changes
  useEffect(() => {
    setErrors({})
    setCategory('')
    
    if (accounts.length > 0) {
      const defaultSource = selectedAccount?.id || accounts[0]?.id || ''
      const defaultDest = accounts.length > 1 
        ? (accounts[1]?.id || '')
        : (accounts[0]?.id || '')
      setSourceAccount(defaultSource)
      setDestAccount(defaultDest)
    }
  }, [accounts, txType, selectedAccount])

  // Validate form before submission
  const validateForm = () => {
    const newErrors = {}
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0'
    }
    
    if (!description || description.trim().length < 2) {
      newErrors.description = 'Please enter a description (at least 2 characters)'
    }
    
    if (!category || category === 'uncategorized') {
      newErrors.category = 'Please select a category'
    }
    
    if (txType === 'expense' && !sourceAccount) {
      newErrors.source = 'Please select a source account'
    }
    
    if (txType === 'income' && !sourceAccount) {
      newErrors.dest = 'Please select a destination account'
    }
    
    if (txType === 'transfer') {
      if (!sourceAccount) newErrors.source = 'Please select a source account'
      if (!destAccount) newErrors.dest = 'Please select a destination account'
      if (sourceAccount === destAccount) {
        newErrors.dest = 'Source and destination accounts must be different'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      const firstError = Object.keys(errors)[0]
      if (firstError === 'amount' && amountInputRef.current) {
        amountInputRef.current.focus()
      } else if (firstError === 'description' && descriptionInputRef.current) {
        descriptionInputRef.current.focus()
      }
      return
    }

    setSaving(true)
    
    try {
      const amountValue = Math.abs(parseFloat(amount))
      
      const payload = {
        user_id: user.id,
        description: description.trim(),
        amount: amountValue,
        category: category || 'uncategorized',
        needs_review: false,
      }

      if (txType === 'expense') {
        payload.source_account_id = sourceAccount
        payload.destination_account_id = null
      } else if (txType === 'income') {
        payload.source_account_id = null
        payload.destination_account_id = sourceAccount
      } else {
        payload.source_account_id = sourceAccount
        payload.destination_account_id = destAccount
      }

      const { error } = await supabase.from('transactions').insert([payload])
      if (error) throw error
      
      setIsOpen(false)
      showToast(
        txType === 'expense' ? `💳 Expense logged: ${description}` :
        txType === 'income' ? `💰 Income logged: ${description}` :
        `🔄 Transfer logged: ${description}`,
        'success'
      )
      fetchAllData()
      
    } catch (error) { 
      console.error('❌ Error details:', error)
      showToast('Error saving transaction: ' + error.message, 'error')
    } finally { 
      setSaving(false) 
    }
  }

  const getAccountName = (id) => {
    const account = accounts.find(a => a.id === id)
    return account?.account_name || 'Unknown'
  }

  const formatMYR = (amount) => {
    return new Intl.NumberFormat('en-MY', { 
      style: 'currency', 
      currency: 'MYR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e)
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all"
      onKeyDown={handleKeyDown}
    >
      {/* Clean White Minimalist Container Layer */}
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl max-h-[95vh] flex flex-col modal-enter border border-slate-100">
        
        {/* Header Block View */}
        <div className="p-5 bg-white border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Log Transaction</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-center rounded-full transition-colors text-slate-400 hover:text-slate-600"
            aria-label="Close modal"
          >
            <X className="w-5 h-5"/>
          </button>
        </div>
        
        {/* Form Scroll Area */}
        <div className="p-5 md:p-6 overflow-y-auto flex-1 bg-white">
          {/* Segmented Type Controller */}
          <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl">
            {[
              { type: 'expense', label: 'Expense', icon: <ArrowDownRight className="w-4 h-4" />, color: 'text-red-500', active: 'bg-white text-slate-900 shadow-sm' },
              { type: 'income', label: 'Income', icon: <ArrowUpRight className="w-4 h-4" />, color: 'text-emerald-500', active: 'bg-white text-slate-900 shadow-sm' },
              { type: 'transfer', label: 'Transfer', icon: <ArrowRight className="w-4 h-4" />, color: 'text-blue-500', active: 'bg-white text-slate-900 shadow-sm' }
            ].map(t => (
              <button 
                key={t.type} 
                type="button"
                onClick={() => setTxType(t.type)} 
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                  txType === t.type 
                    ? t.active 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className={txType === t.type ? (txType === 'expense' ? 'text-red-500' : txType === 'income' ? 'text-emerald-500' : 'text-blue-500') : t.color}>
                  {t.icon}
                </span>
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Amount (RM)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">RM</span>
                  <input 
                    ref={amountInputRef}
                    type="number" 
                    step="0.01" 
                    min="0.01"
                    required 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    className={`w-full bg-slate-50 border ${
                      errors.amount ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-slate-900'
                    } rounded-xl py-3 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.amount}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select 
                  value={category} 
                  onChange={(e) => {
                    setCategory(e.target.value)
                    setErrors({ ...errors, category: '' })
                  }} 
                  className={`w-full bg-slate-50 border ${
                    errors.category ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-slate-900'
                  } rounded-xl py-3 px-3 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                >
                  <option value="">Select category...</option>
                  {filteredMainCategories.map(main => {
                    const subCategories = getFilteredSubCategories(main.id)
                    return (
                      <optgroup key={main.id} label={main.name}>
                        {subCategories.length > 0 ? (
                          subCategories.map(sub => (
                            <option key={sub.id} value={`${main.name} > ${sub.name}`}>
                              {sub.name}
                            </option>
                          ))
                        ) : (
                          <option key={main.id} value={main.name}>
                            {main.name}
                          </option>
                        )}
                      </optgroup>
                    )
                  })}
                </select>
                {errors.category && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.category}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
              <input 
                ref={descriptionInputRef}
                type="text" 
                required 
                value={description} 
                onChange={(e) => {
                  setDescription(e.target.value)
                  setErrors({ ...errors, description: '' })
                }} 
                className={`w-full bg-slate-50 border ${
                  errors.description ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-slate-900'
                } rounded-xl py-3 px-3 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                placeholder="e.g. Lunch at Nasi Kandar, Salary, Rent"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.description}
                </p>
              )}
            </div>

            {txType === 'expense' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pay From</label>
                <select 
                  value={sourceAccount} 
                  onChange={(e) => {
                    setSourceAccount(e.target.value)
                    setErrors({ ...errors, source: '' })
                  }} 
                  className={`w-full bg-slate-50 border ${
                    errors.source ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-slate-900'
                  } rounded-xl py-3 px-3 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.account_name}</option>
                  ))}
                </select>
                {sourceAccount && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Available Balance: <span className="font-semibold text-slate-600">{formatMYR(accounts.find(a => a.id === sourceAccount)?.balance || 0)}</span>
                  </p>
                )}
              </div>
            )}

            {txType === 'income' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deposit To</label>
                <select 
                  value={sourceAccount} 
                  onChange={(e) => setSourceAccount(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 focus:ring-slate-900 rounded-xl py-3 px-3 text-sm outline-none focus:ring-2 focus:border-transparent transition-all"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.account_name}</option>
                  ))}
                </select>
              </div>
            )}

            {txType === 'transfer' && (
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">From</label>
                  <select 
                    value={sourceAccount} 
                    onChange={(e) => {
                      setSourceAccount(e.target.value)
                      setErrors({ ...errors, source: '' })
                    }} 
                    className={`w-full bg-slate-50 border ${
                      errors.source ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-slate-900'
                    } rounded-xl py-3 px-3 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.account_name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">To</label>
                  <select 
                    value={destAccount} 
                    onChange={(e) => {
                      setDestAccount(e.target.value)
                      setErrors({ ...errors, dest: '' })
                    }} 
                    className={`w-full bg-slate-50 border ${
                      errors.dest ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-slate-900'
                    } rounded-xl py-3 px-3 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.account_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Neutral slate-themed summary panel */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 flex items-start gap-3">
              <div className={`flex items-center justify-center p-2 rounded-lg bg-slate-200/60 ${txType === 'expense' ? 'text-red-500' : txType === 'income' ? 'text-emerald-500' : 'text-blue-500'}`}>
                {txType === 'expense' ? <ArrowDownRight className="w-4 h-4" /> : txType === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Summary Preview</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {txType === 'expense' && sourceAccount && (
                    <>Deducting <span className="font-semibold text-slate-900">{formatMYR(parseFloat(amount) || 0)}</span> from <span className="font-semibold text-slate-900">{getAccountName(sourceAccount)}</span></>
                  )}
                  {txType === 'income' && sourceAccount && (
                    <>Depositing <span className="font-semibold text-slate-900">{formatMYR(parseFloat(amount) || 0)}</span> into <span className="font-semibold text-slate-900">{getAccountName(sourceAccount)}</span></>
                  )}
                  {txType === 'transfer' && sourceAccount && destAccount && (
                    <>Moving <span className="font-semibold text-slate-900">{formatMYR(parseFloat(amount) || 0)}</span> from <span className="font-semibold text-slate-900">{getAccountName(sourceAccount)}</span> → <span className="font-semibold text-slate-900">{getAccountName(destAccount)}</span></>
                  )}
                  {description && <span className="text-slate-400 italic"> &ldquo;{description}&rdquo;</span>}
                </p>
              </div>
            </div>

            {/* Action Panel Buttons */}
            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving} 
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Log Transaction
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}