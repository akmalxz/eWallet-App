// src/components/dashboard/ActionLedger.jsx
import { useState } from 'react'
import { 
  Clock, ArrowDownRight, ArrowUpRight, RefreshCw, AlertTriangle, 
  Check, Trash2, Edit2, X, Save 
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
  isRefreshing 
}) => {
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({ description: '', category: '', amount: '' })
  const [editErrors, setEditErrors] = useState({})

  // Start editing a transaction
  const startEdit = (tx) => {
    setEditingId(tx.id)
    setEditData({
      description: tx.description || '',
      category: tx.category || '',
      amount: tx.amount || ''
    })
    setEditErrors({})
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null)
    setEditData({ description: '', category: '', amount: '' })
    setEditErrors({})
  }

  // Validate edit form
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
    
    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Save edited transaction
  const saveEdit = () => {
    if (!validateEdit()) return

    // Log what's being sent
    console.log('📤 Saving edit:', {
      id: editingId,
      data: {
        description: editData.description.trim(),
        category: editData.category,
        amount: parseFloat(editData.amount)
      }
    })

    handleEditTransaction(editingId, {
      description: editData.description.trim(),
      category: editData.category,
      amount: parseFloat(editData.amount)
    })
    
    // Reset edit state
    setEditingId(null)
    setEditData({ description: '', category: '', amount: '' })
    setEditErrors({})
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  // Check if a transaction is currently being edited
  const isEditing = (id) => editingId === id

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[750px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> Action Ledger
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-1.5 rounded-lg transition-colors ${
              isRefreshing 
                ? 'text-slate-400 cursor-not-allowed' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="Refresh transactions"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2">
        {recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Clock className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">No transactions yet</p>
            <p className="text-xs">Start by logging your first transaction above</p>
          </div>
        ) : (
          recentTransactions.map(tx => {
            const isIncome = !tx.source_account_id && tx.destination_account_id
            const isTransfer = tx.source_account_id && tx.destination_account_id
            const isEditingThis = isEditing(tx.id)
            
            // Verification Inbox Card (Needs Review)
            if (tx.needs_review && !isEditingThis) {
              return (
                <div key={tx.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm mb-2">
                  <div className="flex justify-between items-start mb-3">
                    <div className="pr-4">
                      <p className="text-sm font-bold text-amber-900 leading-tight">{tx.description}</p>
                      <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3"/> Pending Verification
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{formatMYR(tx.amount)}</span>
                  </div>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 bg-white border border-amber-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-amber-500"
                      defaultValue={tx.category}
                      id={`cat-select-${tx.id}`}
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
                    <button 
                      onClick={() => handleApproveTransaction(
                        tx.id, 
                        document.getElementById(`cat-select-${tx.id}`).value
                      )}
                      className="bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center"
                      title="Approve transaction"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteTransaction(tx.id, tx.description)}
                      className="bg-red-100 hover:bg-red-200 text-red-600 p-1.5 rounded-lg transition-colors flex items-center justify-center"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            }

            // Editing Mode
            if (isEditingThis) {
              return (
                <div key={`edit-${tx.id}`} className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm mb-2">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-medium text-blue-600">✏️ Editing Transaction</span>
                    <button 
                      onClick={cancelEdit}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                      <input
                        type="text"
                        value={editData.description}
                        onChange={(e) => {
                          setEditData({ ...editData, description: e.target.value })
                          setEditErrors({ ...editErrors, description: '' })
                        }}
                        onKeyDown={handleKeyDown}
                        className={`w-full bg-white border ${
                          editErrors.description ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                        } rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                        placeholder="Description"
                        autoFocus
                      />
                      {editErrors.description && (
                        <p className="mt-0.5 text-xs text-red-500">{editErrors.description}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Amount (RM)</label>
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
                          editErrors.amount ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                        } rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
                        placeholder="0.00"
                      />
                      {editErrors.amount && (
                        <p className="mt-0.5 text-xs text-red-500">{editErrors.amount}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                    <select
                      value={editData.category}
                      onChange={(e) => {
                        setEditData({ ...editData, category: e.target.value })
                        setEditErrors({ ...editErrors, category: '' })
                      }}
                      onKeyDown={handleKeyDown}
                      className={`w-full bg-white border ${
                        editErrors.category ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                      } rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:border-transparent transition-all`}
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
                      <p className="mt-0.5 text-xs text-red-500">{editErrors.category}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" /> Save Changes
                    </button>
                  </div>
                </div>
              )
            }

            // Standard Ledger Card (Verified Data)
            return (
              <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 group">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-1.5 rounded-full ${
                    isIncome ? 'bg-emerald-50' : 
                    isTransfer ? 'bg-blue-50' : 'bg-slate-100'
                  }`}>
                    {isIncome ? 
                      <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : 
                      isTransfer ? 
                        <RefreshCw className="w-4 h-4 text-blue-500" /> : 
                        <ArrowDownRight className="w-4 h-4 text-slate-500" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{tx.description}</p>
                    <p className="text-xs text-slate-400 capitalize">{tx.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <span className={`text-sm font-bold ${
                    isIncome ? 'text-emerald-600' : 
                    isTransfer ? 'text-slate-600' : 'text-slate-900'
                  }`}>
                    {isIncome ? '+' : (isTransfer ? '' : '-')}{formatMYR(tx.amount)}
                  </span>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEdit(tx)}
                      className="p-1 text-slate-400 hover:text-blue-500 rounded transition-colors"
                      title="Edit transaction"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleDeleteTransaction(tx.id, tx.description)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}