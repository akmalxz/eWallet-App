// src/components/dashboard/ActionLedger.jsx
import { useState, useRef, useMemo } from 'react'
import { 
  Clock, ArrowDownRight, ArrowUpRight, RefreshCw, AlertTriangle, 
  Check, Trash2, Edit2, X, Save, Plus, Inbox, Calendar, ChevronDown, ChevronUp 
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

export const ActionLedger = ({ 
  recentTransactions, 
  mainCategories, 
  getSubCategories, 
  handleApproveTransaction, 
  handleDeleteTransaction,
  handleEditTransaction,
  onRefresh,
  isRefreshing,
  accounts,
  onAddTransaction
}) => {
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({ 
    description: '', 
    category: '', 
    amount: '',
    source_account_id: '',
    destination_account_id: ''
  })
  const [editErrors, setEditErrors] = useState({})
  const [swipeIndex, setSwipeIndex] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({})
  const touchStartX = useRef(0)

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    if (!recentTransactions || recentTransactions.length === 0) return []

    const groups = {}
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    recentTransactions.forEach(tx => {
      const date = new Date(tx.transaction_date || tx.created_at)
      const dateKey = date.toISOString().split('T')[0]
      
      let label
      if (dateKey === today.toISOString().split('T')[0]) {
        label = 'Today'
      } else if (dateKey === yesterday.toISOString().split('T')[0]) {
        label = 'Yesterday'
      } else {
        label = date.toLocaleDateString('en-MY', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })
      }

      if (!groups[dateKey]) {
        // Today's group is expanded by default, others collapsed
        const isToday = dateKey === today.toISOString().split('T')[0]
        groups[dateKey] = { 
          label, 
          date: dateKey, 
          transactions: [],
          isExpanded: isToday // ✅ Today expanded by default
        }
      }
      groups[dateKey].transactions.push(tx)
    })

    // Sort groups by date (newest first)
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
  }, [recentTransactions])

  // Toggle group expansion
  const toggleGroup = (dateKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }))
  }

  // Check if a group is expanded (default to true for Today)
  const isGroupExpanded = (group) => {
    if (group.label === 'Today') return true // Today always expanded
    return expandedGroups[group.date] ?? false // Other groups collapsed by default
  }

  const startEdit = (tx) => {
    setEditingId(tx.id)
    setEditData({
      description: tx.description || '',
      category: tx.category || '',
      amount: tx.amount || '',
      source_account_id: tx.source_account_id || '',
      destination_account_id: tx.destination_account_id || ''
    })
    setEditErrors({})
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditData({ 
      description: '', 
      category: '', 
      amount: '',
      source_account_id: '',
      destination_account_id: ''
    })
    setEditErrors({})
  }

  const validateEdit = () => {
    const errors = {}
    
    if (!editData.description || editData.description.trim().length < 2) {
      errors.description = 'Description must be at least 2 characters'
    }
    
    if (!editData.category || editData.category === 'uncategorized') {
      errors.category = 'Please select a category'
    }
    
    const amountNum = parseFloat(editData.amount)
    if (!editData.amount || isNaN(amountNum) || amountNum <= 0) {
      errors.amount = 'Please enter a valid amount greater than 0'
    }

    const isIncome = !editData.source_account_id && editData.destination_account_id
    const isExpense = editData.source_account_id && !editData.destination_account_id
    const isTransfer = editData.source_account_id && editData.destination_account_id

    if (!isIncome && !isExpense && !isTransfer) {
      errors.accounts = 'Please select at least one account'
    }

    if (isTransfer && editData.source_account_id === editData.destination_account_id) {
      errors.accounts = 'Source and destination accounts must be different'
    }
    
    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  const saveEdit = () => {
    if (!validateEdit()) return

    const amountNum = parseFloat(editData.amount)
    const isIncome = !editData.source_account_id && editData.destination_account_id
    const isExpense = editData.source_account_id && !editData.destination_account_id
    const isTransfer = editData.source_account_id && editData.destination_account_id

    const finalAmount = Math.abs(amountNum)

    handleEditTransaction(editingId, {
      description: editData.description.trim(),
      category: editData.category,
      amount: finalAmount,
      source_account_id: editData.source_account_id || null,
      destination_account_id: editData.destination_account_id || null,
      transaction_type: isIncome ? 'income' : isExpense ? 'expense' : 'transfer'
    })
    
    setEditingId(null)
    setEditData({ 
      description: '', 
      category: '', 
      amount: '',
      source_account_id: '',
      destination_account_id: ''
    })
    setEditErrors({})
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const isEditing = (id) => editingId === id

  const getAccountName = (id) => {
    const account = accounts.find(a => a.id === id)
    return account?.account_name || 'Unknown'
  }

  const handleTouchStart = (e, index) => {
    touchStartX.current = e.touches[0].clientX
    setSwipeIndex(index)
  }

  const handleTouchMove = (e, index) => {
    if (swipeIndex !== index) return
    const diff = e.touches[0].clientX - touchStartX.current
    const element = document.getElementById(`tx-${index}`)
    if (element) {
      if (diff < -30) {
        element.style.transform = 'translateX(-80px)'
      } else {
        element.style.transform = 'translateX(0)'
      }
    }
  }

  const handleTouchEnd = (e, index) => {
    if (swipeIndex !== index) return
    const element = document.getElementById(`tx-${index}`)
    if (element) {
      element.style.transform = 'translateX(0)'
    }
    setSwipeIndex(null)
  }

  // Calculate total for each day group
  const getDailyTotal = (transactions) => {
    return transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)
  }

  if (!recentTransactions || recentTransactions.length === 0) {
    return (
      <section className="bg-white rounded-2xl shadow-md border border-slate-100 flex flex-col overflow-hidden transition-all duration-300">
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> Action Ledger
          </h2>
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              isRefreshing 
                ? 'text-slate-300 cursor-not-allowed' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="Refresh transactions"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
          <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-300 shadow-sm shadow-slate-100/40">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">No Transactions Yet</p>
          <p className="text-xs text-slate-400 text-center mt-1 max-w-xs leading-relaxed">
            Record a fast entry with the platform omnibar tools or choose the transaction button below.
          </p>
          <button 
            onClick={onAddTransaction}
            className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Log Transaction
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl shadow-md border border-slate-100 flex flex-col overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between flex-shrink-0">
        <h2 className="text-xs md:text-sm font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> Action Ledger
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
            {recentTransactions.length} transactions
          </span>
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              isRefreshing 
                ? 'text-slate-300 cursor-not-allowed' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="Refresh transactions"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Transaction List Box */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3">
        {groupedTransactions.map((group, groupIndex) => {
          const dailyTotal = getDailyTotal(group.transactions)
          const isToday = group.label === 'Today'
          const isExpanded = isGroupExpanded(group)

          return (
            <div key={group.date} className="space-y-1.5">
              {/* Date Separator with Expand/Collapse Toggle */}
              <div 
                className="flex items-center gap-3 px-2 py-1.5 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors select-none"
                onClick={() => toggleGroup(group.date)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className={`text-xs font-bold truncate ${
                    isToday ? 'text-blue-600' : 'text-slate-500'
                  }`}>
                    {group.label}
                  </span>
                  {!isExpanded && (
                    <span className="text-[10px] font-medium text-slate-400 shrink-0">
                      ({group.transactions.length} txns)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-medium text-slate-400">
                    {formatMYR(dailyTotal)}
                  </span>
                  <button 
                    className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleGroup(group.date)
                    }}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Transactions for this date - Collapsible */}
              {isExpanded && (
                <div className="space-y-1.5 animate-fadeIn">
                  {group.transactions.map((tx, index) => {
                    const isIncome = !tx.source_account_id && tx.destination_account_id
                    const isTransfer = tx.source_account_id && tx.destination_account_id
                    const isEditingThis = isEditing(tx.id)
                    const globalIndex = recentTransactions.findIndex(t => t.id === tx.id)
                    
                    if (tx.needs_review && !isEditingThis) {
                      return (
                        <div key={tx.id} className="bg-amber-50/40 border border-amber-200 rounded-xl p-3.5 shadow-sm shadow-amber-50/20 animate-fadeIn">
                          <div className="flex justify-between items-start mb-3">
                            <div className="pr-4">
                              <p className="text-sm font-bold text-amber-900 leading-tight">{tx.description}</p>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5"/> Pending Verification
                              </p>
                            </div>
                            <span className="text-sm font-black text-slate-800 whitespace-nowrap">{formatMYR(tx.amount)}</span>
                          </div>
                          <div className="flex gap-2">
                            <select 
                              className="flex-1 min-w-[120px] bg-white border border-amber-200 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                              defaultValue={tx.category}
                              id={`cat-select-${tx.id}`}
                            >
                              <option value="uncategorized">Select category...</option>
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
                            <button 
                              onClick={() => handleApproveTransaction(
                                tx.id, 
                                document.getElementById(`cat-select-${tx.id}`).value
                              )}
                              className="w-9 h-9 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm transition-colors flex items-center justify-center shrink-0"
                              title="Approve transaction"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteTransaction(tx.id, tx.description)}
                              className="w-9 h-9 bg-red-100 border border-red-200 text-red-600 rounded-xl hover:bg-red-200/80 transition-colors flex items-center justify-center shrink-0"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    }

                    const editIsIncome = !editData.source_account_id && editData.destination_account_id
                    const editIsExpense = editData.source_account_id && !editData.destination_account_id
                    const editIsTransfer = editData.source_account_id && editData.destination_account_id

                    return (
                      <div key={tx.id} className="relative overflow-hidden rounded-xl border border-slate-100 bg-white">
                        
                        {/* Inline Editor Container with Grid Expansion */}
                        <div className={`grid transition-all duration-300 ease-in-out ${isEditingThis ? 'grid-rows-[1fr] opacity-100 bg-slate-50/50 p-4' : 'grid-rows-[0fr] opacity-0'}`}>
                          <div className="overflow-hidden space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">✏️ Editing Mode</span>
                              <button 
                                onClick={cancelEdit}
                                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                              <input
                                type="text"
                                value={editData.description}
                                onChange={(e) => {
                                  setEditData({ ...editData, description: e.target.value })
                                  setEditErrors({ ...editErrors, description: '' })
                                }}
                                onKeyDown={handleKeyDown}
                                className={`w-full bg-white border ${
                                  editErrors.description ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-slate-900'
                                } rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                                placeholder="Description"
                              />
                              {editErrors.description && (
                                <p className="mt-1 text-[11px] text-red-500 font-medium">{editErrors.description}</p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount (RM)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={editData.amount}
                                  onChange={(e) => {
                                    setEditData({ ...editData, amount: e.target.value })
                                    setEditErrors({ ...editErrors, amount: '' })
                                  }}
                                  onKeyDown={handleKeyDown}
                                  className={`w-full bg-white border ${
                                    editErrors.amount ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-slate-900'
                                  } rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                                  placeholder="0.00"
                                />
                                {editErrors.amount && (
                                  <p className="mt-1 text-[11px] text-red-500 font-medium">{editErrors.amount}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                                <select
                                  value={editData.category}
                                  onChange={(e) => {
                                    setEditData({ ...editData, category: e.target.value })
                                    setEditErrors({ ...editErrors, category: '' })
                                  }}
                                  onKeyDown={handleKeyDown}
                                  className={`w-full bg-white border ${
                                    editErrors.category ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-slate-900'
                                  } rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                                >
                                  <option value="">Select category...</option>
                                  {mainCategories.map(main => (
                                    <optgroup key={main.id} label={main.name}>
                                      {getSubCategories(main.id).map(sub => (
                                        <option key={sub.id} value={`${main.name} > ${sub.name}`}>{sub.name}</option>
                                      ))}
                                      {getSubCategories(main.id).length === 0 && (
                                        <option value={main.name}>{main.name}</option>
                                      )}
                                    </optgroup>
                                  ))}
                                </select>
                                {editErrors.category && (
                                  <p className="mt-1 text-[11px] text-red-500 font-medium">{editErrors.category}</p>
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Transaction Type</label>
                              <div className="flex gap-1.5 bg-slate-200/50 p-1 rounded-xl border border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditData({ 
                                      ...editData, 
                                      source_account_id: accounts[0]?.id || '',
                                      destination_account_id: ''
                                    })
                                    setEditErrors({ ...editErrors, accounts: '' })
                                  }}
                                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                    editIsExpense 
                                      ? 'bg-red-50 text-red-700 font-bold border border-red-200' 
                                      : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  Expense
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditData({ 
                                      ...editData, 
                                      source_account_id: '',
                                      destination_account_id: accounts[0]?.id || ''
                                    })
                                    setEditErrors({ ...editErrors, accounts: '' })
                                  }}
                                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                    editIsIncome 
                                      ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' 
                                      : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  Income
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditData({ 
                                      ...editData, 
                                      source_account_id: accounts[0]?.id || '',
                                      destination_account_id: accounts[1]?.id || accounts[0]?.id || ''
                                    })
                                    setEditErrors({ ...editErrors, accounts: '' })
                                  }}
                                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                    editIsTransfer 
                                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200' 
                                      : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  Transfer
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              {editIsExpense || editIsTransfer ? (
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    {editIsExpense ? 'Pay From' : 'From'}
                                  </label>
                                  <select
                                    value={editData.source_account_id}
                                    onChange={(e) => {
                                      setEditData({ ...editData, source_account_id: e.target.value })
                                      setEditErrors({ ...editErrors, accounts: '' })
                                    }}
                                    className="w-full bg-white border border-slate-200 focus:ring-slate-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent transition-all"
                                  >
                                    {accounts.map(a => (
                                      <option key={a.id} value={a.id}>{a.account_name}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Source</label>
                                  <select
                                    value=""
                                    disabled
                                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                                  >
                                    <option value="">None Required</option>
                                  </select>
                                </div>
                              )}

                              {editIsIncome || editIsTransfer ? (
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    {editIsIncome ? 'Deposit To' : 'To'}
                                  </label>
                                  <select
                                    value={editData.destination_account_id}
                                    onChange={(e) => {
                                      setEditData({ ...editData, destination_account_id: e.target.value })
                                      setEditErrors({ ...editErrors, accounts: '' })
                                    }}
                                    className="w-full bg-white border border-slate-200 focus:ring-slate-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:border-transparent transition-all"
                                  >
                                    {accounts.map(a => (
                                      <option key={a.id} value={a.id}>{a.account_name}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Destination</label>
                                  <select
                                    value=""
                                    disabled
                                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                                  >
                                    <option value="">None Required</option>
                                  </select>
                                </div>
                              )}
                            </div>

                            {editErrors.accounts && (
                              <p className="text-[11px] text-red-500 font-medium">{editErrors.accounts}</p>
                            )}

                            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={saveEdit}
                                className="px-4 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md"
                              >
                                <Save className="w-3.5 h-3.5" /> Save Changes
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Standard Static Interactive Row Template */}
                        <div 
                          id={`tx-${globalIndex}`}
                          className={`flex items-center justify-between p-3.5 hover:bg-slate-50/60 transition-all duration-200 border-b border-slate-50 group last:border-none ${isEditingThis ? 'hidden' : ''}`}
                          onTouchStart={(e) => handleTouchStart(e, globalIndex)}
                          onTouchMove={(e) => handleTouchMove(e, globalIndex)}
                          onTouchEnd={(e) => handleTouchEnd(e, globalIndex)}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className={`w-8 h-8 flex items-center justify-center rounded-xl shrink-0 ${
                              isIncome ? 'bg-emerald-50 text-emerald-600' : 
                              isTransfer ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
                            }`}>
                              {isIncome ? 
                                <ArrowUpRight className="w-4 h-4" /> : 
                                isTransfer ? 
                                  <RefreshCw className="w-3.5 h-3.5" /> : 
                                  <ArrowDownRight className="w-4 h-4" />
                              }
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-700 truncate">{tx.description}</p>
                              <p className="text-xs text-slate-400 capitalize">{tx.category || 'Uncategorized'}</p>
                              <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md inline-block">
                                {isIncome ? `→ ${getAccountName(tx.destination_account_id)}` :
                                 isTransfer ? `${getAccountName(tx.source_account_id)} → ${getAccountName(tx.destination_account_id)}` :
                                 `← ${getAccountName(tx.source_account_id)}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 ml-2 shrink-0">
                            <span className={`text-sm font-black whitespace-nowrap ${
                              isIncome ? 'text-emerald-600' : 
                              isTransfer ? 'text-slate-600' : 'text-slate-800'
                            }`}>
                              {isIncome ? '+' : (isTransfer ? '' : '-')}{formatMYR(tx.amount)}
                            </span>
                            
                            {/* Action Controllers Panel */}
                            <div className="flex items-center md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity gap-0.5">
                              <button 
                                onClick={() => startEdit(tx)}
                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                                title="Edit transaction"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteTransaction(tx.id, tx.description)}
                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete transaction"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}