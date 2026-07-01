// src/components/modals/ManualTransactionModal.jsx
import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { X, ArrowUpRight, ArrowDownRight, ArrowRight, Check, AlertCircle } from 'lucide-react'

export const ManualTransactionModal = ({ 
  setIsOpen, 
  user, 
  accounts, 
  categories, 
  getSubCategories, 
  fetchAllData, 
  showToast 
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

  // Smart category filtering
  const filteredCategories = useMemo(() => {
    if (!categories || categories.length === 0) return []
    
    const allCategories = [...categories]
    const mainCats = allCategories.filter(c => !c.parent_id)
    
    if (mainCats.length === 0) return []
    
    if (txType === 'income') {
      const incomeKeywords = ['income', 'salary', 'bonus', 'pay', 'paycheck', 'received', 'deposit', 'refund']
      
      const incomeMainCats = mainCats.filter(main => 
        incomeKeywords.some(keyword => 
          main.name.toLowerCase().includes(keyword) ||
          (main.keywords && main.keywords.some(k => incomeKeywords.includes(k.toLowerCase())))
        )
      )
      
      if (incomeMainCats.length > 0) {
        return allCategories.filter(c => 
          incomeMainCats.some(main => main.id === c.id || c.parent_id === main.id)
        )
      }
    }
    
    return allCategories
  }, [categories, txType])

  const filteredMainCategories = useMemo(() => {
    return filteredCategories.filter(c => !c.parent_id)
  }, [filteredCategories])

  const getFilteredSubCategories = (parentId) => {
    return filteredCategories.filter(c => c.parent_id === parentId)
  }

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
      // ✅ Using consistent 'id' field
      const defaultSource = accounts[0]?.id || ''
      const defaultDest = accounts.length > 1 
        ? (accounts[1]?.id || '')
        : (accounts[0]?.id || '')
      setSourceAccount(defaultSource)
      setDestAccount(defaultDest)
    }
  }, [accounts, txType])

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

      console.log('📤 Sending payload:', payload)

      const { error } = await supabase.from('transactions').insert([payload])
      if (error) {
        console.error('❌ Supabase error:', error)
        throw error
      }
      
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

  // ✅ Using consistent 'id' field
  const getAccountName = (id) => {
    const account = accounts.find(a => a.id === id)
    return account?.account_name || 'Unknown'
  }

  // Helper function - format currency
  const formatMYR = (amount) => {
    return new Intl.NumberFormat('en-MY', { 
      style: 'currency', 
      currency: 'MYR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Handle keyboard shortcuts
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
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Log Transaction</h2>
            <p className="text-xs text-slate-400 mt-0.5">Quickly record your financial activity</p>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-400"/>
          </button>
        </div>
        
        {/* Transaction Type Selector */}
        <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
          {[
            { type: 'expense', label: 'Expense', icon: <ArrowDownRight className="w-4 h-4" />, color: 'text-red-500' },
            { type: 'income', label: 'Income', icon: <ArrowUpRight className="w-4 h-4" />, color: 'text-emerald-500' },
            { type: 'transfer', label: 'Transfer', icon: <ArrowRight className="w-4 h-4" />, color: 'text-blue-500' }
          ].map(t => (
            <button 
              key={t.type} 
              onClick={() => setTxType(t.type)} 
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium capitalize rounded-xl transition-all ${
                txType === t.type 
                  ? 'bg-white shadow-sm text-slate-900' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className={t.color}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount and Category Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
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
                    errors.amount ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                  } rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                  placeholder="0.00"
                  aria-describedby={errors.amount ? "amount-error" : undefined}
                />
              </div>
              {errors.amount && (
                <p id="amount-error" className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.amount}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Category
                {txType === 'income' && (
                  <span className="ml-1 text-xs font-normal text-emerald-500">(Income)</span>
                )}
                {txType === 'expense' && (
                  <span className="ml-1 text-xs font-normal text-red-400">(Expense)</span>
                )}
                {txType === 'transfer' && (
                  <span className="ml-1 text-xs font-normal text-blue-400">(Transfer)</span>
                )}
              </label>
              <select 
                value={category} 
                onChange={(e) => {
                  setCategory(e.target.value)
                  setErrors({ ...errors, category: '' })
                }} 
                className={`w-full bg-slate-50 border ${
                  errors.category ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                } rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                aria-describedby={errors.category ? "category-error" : undefined}
              >
                <option value="">Select category...</option>
                {filteredMainCategories.map(main => (
                  <optgroup key={main.id} label={main.name}>
                    {getFilteredSubCategories(main.id).map(sub => (
                      <option key={sub.id} value={`${main.name} > ${sub.name}`}>{sub.name}</option>
                    ))}
                    {getFilteredSubCategories(main.id).length === 0 && (
                      <option value={main.name}>{main.name}</option>
                    )}
                  </optgroup>
                ))}
              </select>
              {errors.category && (
                <p id="category-error" className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.category}
                </p>
              )}
              {filteredMainCategories.length === 0 && (
                <p className="mt-1 text-xs text-amber-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> No categories found. Please add categories in Settings.
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description</label>
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
                errors.description ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
              } rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
              placeholder="e.g. Lunch at Nasi Kandar, Salary, Rent"
              aria-describedby={errors.description ? "description-error" : undefined}
            />
            {errors.description && (
              <p id="description-error" className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.description}
              </p>
            )}
          </div>

          {/* Account Selection - ✅ Using consistent 'id' field */}
          {txType === 'expense' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Pay From
                <span className="ml-1 text-xs font-normal text-slate-400">(Select source account)</span>
              </label>
              <select 
                value={sourceAccount} 
                onChange={(e) => {
                  setSourceAccount(e.target.value)
                  setErrors({ ...errors, source: '' })
                }} 
                className={`w-full bg-slate-50 border ${
                  errors.source ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                } rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.account_name}</option>
                ))}
              </select>
              {errors.source && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.source}
                </p>
              )}
              {sourceAccount && (
                <p className="mt-1.5 text-xs text-slate-400">
                  Balance: <span className="font-medium">{formatMYR(accounts.find(a => a.id === sourceAccount)?.balance || 0)}</span>
                </p>
              )}
            </div>
          )}

          {txType === 'income' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Deposit To
                <span className="ml-1 text-xs font-normal text-slate-400">(Select destination account)</span>
              </label>
              <select 
                value={sourceAccount} 
                onChange={(e) => {
                  setSourceAccount(e.target.value)
                  setErrors({ ...errors, dest: '' })
                }} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.account_name}</option>
                ))}
              </select>
            </div>
          )}

          {txType === 'transfer' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  From
                  <span className="ml-1 text-xs font-normal text-slate-400">(Source)</span>
                </label>
                <select 
                  value={sourceAccount} 
                  onChange={(e) => {
                    setSourceAccount(e.target.value)
                    setErrors({ ...errors, source: '' })
                  }} 
                  className={`w-full bg-slate-50 border ${
                    errors.source ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                  } rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.account_name}</option>
                  ))}
                </select>
                {errors.source && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.source}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  To
                  <span className="ml-1 text-xs font-normal text-slate-400">(Destination)</span>
                </label>
                <select 
                  value={destAccount} 
                  onChange={(e) => {
                    setDestAccount(e.target.value)
                    setErrors({ ...errors, dest: '' })
                  }} 
                  className={`w-full bg-slate-50 border ${
                    errors.dest ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                  } rounded-xl py-2.5 px-3 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.account_name}</option>
                  ))}
                </select>
                {errors.dest && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.dest}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Summary Preview */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Transaction Summary</p>
            <p className="text-sm text-slate-700">
              {txType === 'expense' && sourceAccount && (
                <>💳 <span className="font-medium">{formatMYR(parseFloat(amount) || 0)}</span> from <span className="font-medium">{getAccountName(sourceAccount)}</span></>
              )}
              {txType === 'income' && sourceAccount && (
                <>💰 <span className="font-medium">{formatMYR(parseFloat(amount) || 0)}</span> to <span className="font-medium">{getAccountName(sourceAccount)}</span></>
              )}
              {txType === 'transfer' && sourceAccount && destAccount && (
                <>🔄 <span className="font-medium">{formatMYR(parseFloat(amount) || 0)}</span> from <span className="font-medium">{getAccountName(sourceAccount)}</span> → <span className="font-medium">{getAccountName(destAccount)}</span></>
              )}
              {description && <span className="text-slate-400 ml-1">· {description}</span>}
              {category && <span className="text-xs text-slate-400 ml-1">({category})</span>}
              {(!amount || !description || !category) && (
                <span className="text-xs text-slate-400">Fill in the fields above to see summary</span>
              )}
            </p>
          </div>

          {/* Action Buttons */}
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
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
  )
}