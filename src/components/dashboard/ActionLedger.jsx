// src/components/dashboard/ActionLedger.jsx
import { useState, useMemo } from 'react'
import {
  ArrowDownRight, ArrowUpRight, RefreshCw, List,
  Trash2, Edit2, X, Save, Plus, Inbox, Calendar, ChevronDown, ChevronUp
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { AccountCard } from '../shared/AccountCard'
import { ConfirmSheet } from '../shared/ConfirmSheet'

export const ActionLedger = ({
  recentTransactions,
  mainCategories,
  getSubCategories,
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
    transaction_date: '',
    source_account_id: '',
    destination_account_id: ''
  })
  const [editErrors, setEditErrors] = useState({})
  const [expandedGroups, setExpandedGroups] = useState({})
  const [pendingDelete, setPendingDelete] = useState(null)

  const groupedTransactions = useMemo(() => {
    if (!recentTransactions || recentTransactions.length === 0) return []

    const groups = {}
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    recentTransactions.forEach((tx) => {
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
        const isToday = dateKey === today.toISOString().split('T')[0]
        groups[dateKey] = { label, date: dateKey, transactions: [], isExpanded: isToday }
      }
      groups[dateKey].transactions.push(tx)
    })

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
  }, [recentTransactions])

  const toggleGroup = (dateKey) => {
    setExpandedGroups((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }))
  }

  const isGroupExpanded = (group) => {
    if (group.label === 'Today') return true
    return expandedGroups[group.date] ?? false
  }

  const startEdit = (tx) => {
    const rawDate = tx.transaction_date || tx.created_at
    const formattedDate = rawDate
      ? new Date(rawDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    setEditingId(tx.id)
    setEditData({
      description: tx.description || '',
      category: tx.category || '',
      amount: tx.amount || '',
      transaction_date: formattedDate,
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
      transaction_date: '',
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

    handleEditTransaction(editingId, {
      description: editData.description.trim(),
      category: editData.category,
      amount: Math.abs(amountNum),
      transaction_date: editData.transaction_date,
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
  const accountFor = (id) => accounts.find((a) => a.id === id)
  const getDailyTotal = (transactions) =>
    transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)

  if (!recentTransactions || recentTransactions.length === 0) {
    return (
      <section className="bg-surface rounded-2xl shadow-md border border-line flex flex-col overflow-hidden transition-all duration-300">
        <div className="px-4 pt-4 pb-1 border-b border-line bg-surface-2/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 px-1 mb-3">
            <div className="p-2 rounded-xl bg-surface-2 text-fg-muted border border-line">
              <List className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-fg leading-tight">
                Action Ledger
              </h2>
              <p className="text-[9px] font-bold uppercase tracking-wider text-fg-subtle">
                Verified History
              </p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`ml-auto w-11 h-11 flex items-center justify-center rounded-lg transition-all ${
              isRefreshing
                ? 'text-fg-subtle/50 cursor-not-allowed'
                : 'text-fg-subtle hover:text-fg-muted hover:bg-surface-2'
            }`}
            title="Refresh transactions"
            aria-label="Refresh transactions"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-fg-subtle">
          <div className="w-14 h-14 bg-surface-2 border border-line rounded-2xl flex items-center justify-center mb-4 text-fg-subtle">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-fg">No Transactions Yet</p>
          <p className="text-xs text-fg-subtle text-center mt-1 max-w-xs leading-relaxed">
            Record a fast entry with the platform omnibar tools or choose the transaction button below.
          </p>
          <button
            onClick={onAddTransaction}
            className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-solid hover:bg-brand-solid-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            style={{ minHeight: 44 }}
          >
            <Plus className="w-4 h-4" /> Log Transaction
          </button>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="bg-surface rounded-2xl shadow-md border border-line flex flex-col overflow-hidden transition-all duration-300">
        <div className="px-4 pt-4 pb-1 border-b border-line bg-surface-2/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 px-1 mb-3">
            <div className="p-2 rounded-xl bg-surface-2 text-fg-muted border border-line">
              <List className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-fg leading-tight">
                Action Ledger
              </h2>
              <p className="text-[9px] font-bold uppercase tracking-wider text-fg-subtle">
                Verified History
              </p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`ml-auto w-11 h-11 flex items-center justify-center rounded-lg transition-all ${
              isRefreshing
                ? 'text-fg-subtle/50 cursor-not-allowed'
                : 'text-fg-subtle hover:text-fg-muted hover:bg-surface-2'
            }`}
            title="Refresh transactions"
            aria-label="Refresh transactions"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 p-3">
          {groupedTransactions.map((group) => {
            const dailyTotal = getDailyTotal(group.transactions)
            const isToday = group.label === 'Today'
            const isExpanded = isGroupExpanded(group)

            return (
              <div key={group.date} className="space-y-1.5">
                <div
                  className="flex items-center gap-3 px-2 py-1.5 cursor-pointer hover:bg-surface-2 rounded-lg transition-colors select-none"
                  onClick={() => toggleGroup(group.date)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-fg-subtle shrink-0" />
                    <span
                      className={`text-xs font-bold truncate ${
                        isToday ? 'text-brand' : 'text-fg-muted'
                      }`}
                    >
                      {group.label}
                    </span>
                    {!isExpanded && (
                      <span className="text-[10px] font-medium text-fg-subtle shrink-0">
                        ({group.transactions.length} txns)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-medium text-fg-subtle">
                      {formatMYR(dailyTotal)}
                    </span>
                    <button
                      className="w-11 h-11 flex items-center justify-center text-fg-subtle hover:text-fg-muted hover:bg-surface-2 rounded-lg transition-all"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleGroup(group.date)
                      }}
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-1.5 animate-fadeIn">
                    {group.transactions.map((tx) => {
                      const isIncome = !tx.source_account_id && tx.destination_account_id
                      const isTransfer = tx.source_account_id && tx.destination_account_id
                      const isEditingThis = isEditing(tx.id)
                      const globalIndex = recentTransactions.findIndex((t) => t.id === tx.id)

                      const editIsIncome =
                        !editData.source_account_id && editData.destination_account_id
                      const editIsExpense =
                        editData.source_account_id && !editData.destination_account_id
                      const editIsTransfer =
                        editData.source_account_id && editData.destination_account_id

                      return (
                        <div
                          key={tx.id}
                          className="relative overflow-hidden rounded-xl border border-line bg-surface"
                        >
                          {isEditingThis && (
                            <div className="bg-surface-2/50 p-4 space-y-4 animate-fadeIn">
                              <div className="flex justify-between items-center border-b border-line pb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
                                  Editing
                                </span>
                                <button
                                  onClick={cancelEdit}
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
                                  value={editData.description}
                                  onChange={(e) => {
                                    setEditData({ ...editData, description: e.target.value })
                                    setEditErrors({ ...editErrors, description: '' })
                                  }}
                                  onKeyDown={handleKeyDown}
                                  className={`w-full bg-surface border ${
                                    editErrors.description
                                      ? 'border-danger-border focus:border-danger'
                                      : 'border-line focus:border-brand'
                                  } rounded-xl px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-2 focus:ring-brand/30 transition-all`}
                                  placeholder="Description"
                                />
                                {editErrors.description && (
                                  <p className="mt-1 text-[11px] text-danger font-medium">
                                    {editErrors.description}
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
                                    value={editData.transaction_date}
                                    onChange={(e) =>
                                      setEditData({ ...editData, transaction_date: e.target.value })
                                    }
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
                                    value={editData.amount}
                                    onChange={(e) => {
                                      setEditData({ ...editData, amount: e.target.value })
                                      setEditErrors({ ...editErrors, amount: '' })
                                    }}
                                    onKeyDown={handleKeyDown}
                                    className={`w-full bg-surface border ${
                                      editErrors.amount
                                        ? 'border-danger-border focus:border-danger'
                                        : 'border-line focus:border-brand'
                                    } rounded-xl px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-2 focus:ring-brand/30 transition-all`}
                                    placeholder="0.00"
                                  />
                                  {editErrors.amount && (
                                    <p className="mt-1 text-[11px] text-danger font-medium">
                                      {editErrors.amount}
                                    </p>
                                  )}
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5">
                                    Category
                                  </label>
                                  <select
                                    value={editData.category}
                                    onChange={(e) => {
                                      setEditData({ ...editData, category: e.target.value })
                                      setEditErrors({ ...editErrors, category: '' })
                                    }}
                                    onKeyDown={handleKeyDown}
                                    className={`w-full bg-surface border ${
                                      editErrors.category
                                        ? 'border-danger-border focus:border-danger'
                                        : 'border-line focus:border-brand'
                                    } rounded-xl px-3 py-2.5 text-sm text-fg outline-none focus:ring-2 focus:ring-brand/30 transition-all`}
                                  >
                                    <option value="">Select category...</option>
                                    {mainCategories.map((main) => (
                                      <optgroup key={main.id} label={main.name}>
                                        {getSubCategories(main.id).map((sub) => (
                                          <option
                                            key={sub.id}
                                            value={`${main.name} > ${sub.name}`}
                                          >
                                            {sub.name}
                                          </option>
                                        ))}
                                        {getSubCategories(main.id).length === 0 && (
                                          <option value={main.name}>{main.name}</option>
                                        )}
                                      </optgroup>
                                    ))}
                                  </select>
                                  {editErrors.category && (
                                    <p className="mt-1 text-[11px] text-danger font-medium">
                                      {editErrors.category}
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
                                        ? 'bg-danger-soft text-danger-text border border-danger-border'
                                        : 'text-fg-muted hover:text-fg'
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
                                        ? 'bg-success-soft text-success-text border border-success-border'
                                        : 'text-fg-muted hover:text-fg'
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
                                        destination_account_id:
                                          accounts[1]?.id || accounts[0]?.id || ''
                                      })
                                      setEditErrors({ ...editErrors, accounts: '' })
                                    }}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                      editIsTransfer
                                        ? 'bg-info-soft text-info-text border border-info-border'
                                        : 'text-fg-muted hover:text-fg'
                                    }`}
                                  >
                                    Transfer
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                {editIsExpense || editIsTransfer ? (
                                  <div>
                                    <label className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5">
                                      {editIsExpense ? 'Pay From' : 'From'}
                                    </label>
                                    <select
                                      value={editData.source_account_id}
                                      onChange={(e) => {
                                        setEditData({
                                          ...editData,
                                          source_account_id: e.target.value
                                        })
                                        setEditErrors({ ...editErrors, accounts: '' })
                                      }}
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

                                {editIsIncome || editIsTransfer ? (
                                  <div>
                                    <label className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5">
                                      {editIsIncome ? 'Deposit To' : 'To'}
                                    </label>
                                    <select
                                      value={editData.destination_account_id}
                                      onChange={(e) => {
                                        setEditData({
                                          ...editData,
                                          destination_account_id: e.target.value
                                        })
                                        setEditErrors({ ...editErrors, accounts: '' })
                                      }}
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

                              {editErrors.accounts && (
                                <p className="text-[11px] text-danger font-medium">
                                  {editErrors.accounts}
                                </p>
                              )}

                              <div className="flex gap-2 justify-end pt-2 border-t border-line">
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="px-4 py-2.5 text-xs font-semibold text-fg-muted hover:bg-surface-2 rounded-xl transition-all"
                                  style={{ minHeight: 44 }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  className="px-4 py-2.5 text-xs font-bold bg-brand-solid hover:bg-brand-solid-hover text-white rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md"
                                  style={{ minHeight: 44 }}
                                >
                                  <Save className="w-3.5 h-3.5" /> Save Changes
                                </button>
                              </div>
                            </div>
                          )}

                          {!isEditingThis && (
                            <div
                              id={`tx-${globalIndex}`}
                              className="flex items-center justify-between p-3.5 hover:bg-surface-2/60 transition-all duration-200 border-b border-line group last:border-none"
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div
                                  className={`w-8 h-8 flex items-center justify-center rounded-xl shrink-0 ${
                                    isIncome
                                      ? 'bg-success-soft text-success'
                                      : isTransfer
                                        ? 'bg-info-soft text-info'
                                        : 'bg-surface-2 text-fg-muted'
                                  }`}
                                >
                                  {isIncome ? (
                                    <ArrowUpRight className="w-4 h-4" />
                                  ) : isTransfer ? (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  ) : (
                                    <ArrowDownRight className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-fg truncate">
                                    {tx.description}
                                  </p>
                                  <p className="text-xs text-fg-subtle">
                                    {tx.category || 'Uncategorized'}
                                  </p>

                                  <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                    {isIncome && (
                                      <>
                                        <span className="text-[10px] font-bold text-fg-subtle shrink-0">
                                          →
                                        </span>
                                        {accountFor(tx.destination_account_id) ? (
                                          <AccountCard
                                            account={accountFor(tx.destination_account_id)}
                                            size="chip"
                                            showIcon={false}
                                          />
                                        ) : (
                                          <span className="text-[10px] text-fg-subtle">
                                            Unknown
                                          </span>
                                        )}
                                      </>
                                    )}

                                    {isTransfer && (
                                      <>
                                        {accountFor(tx.source_account_id) ? (
                                          <AccountCard
                                            account={accountFor(tx.source_account_id)}
                                            size="chip"
                                            showIcon={false}
                                          />
                                        ) : (
                                          <span className="text-[10px] text-fg-subtle">
                                            Unknown
                                          </span>
                                        )}
                                        <span className="text-[10px] font-bold text-fg-subtle shrink-0">
                                          →
                                        </span>
                                        {accountFor(tx.destination_account_id) ? (
                                          <AccountCard
                                            account={accountFor(tx.destination_account_id)}
                                            size="chip"
                                            showIcon={false}
                                          />
                                        ) : (
                                          <span className="text-[10px] text-fg-subtle">
                                            Unknown
                                          </span>
                                        )}
                                      </>
                                    )}

                                    {!isIncome && !isTransfer && (
                                      <>
                                        <span className="text-[10px] font-bold text-fg-subtle shrink-0">
                                          ←
                                        </span>
                                        {accountFor(tx.source_account_id) ? (
                                          <AccountCard
                                            account={accountFor(tx.source_account_id)}
                                            size="chip"
                                            showIcon={false}
                                          />
                                        ) : (
                                          <span className="text-[10px] text-fg-subtle">
                                            Unknown
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5 ml-2 shrink-0">
                                <span
                                  className={`text-sm font-black whitespace-nowrap ${
                                    isIncome
                                      ? 'text-success'
                                      : isTransfer
                                        ? 'text-fg-muted'
                                        : 'text-fg'
                                  }`}
                                >
                                  {isIncome ? '+' : isTransfer ? '' : '-'}
                                  {formatMYR(tx.amount)}
                                </span>

                                <div className="flex items-center md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity gap-0.5">
                                  <button
                                    onClick={() => startEdit(tx)}
                                    className="w-9 h-9 flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-2 rounded-lg transition-all"
                                    title="Edit transaction"
                                    aria-label="Edit transaction"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setPendingDelete(tx)}
                                    className="w-9 h-9 flex items-center justify-center text-fg-subtle hover:text-danger hover:bg-danger-soft rounded-lg transition-all"
                                    title="Delete transaction"
                                    aria-label="Delete transaction"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
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

      {pendingDelete && (
        <ConfirmSheet
          destructive
          title={`Delete "${pendingDelete.description || 'transaction'}"?`}
          message={(() => {
            const isBill = !!(pendingDelete.metadata && pendingDelete.metadata.commitment_id)
            return isBill
              ? 'This is a bill payment. Deleting it marks the bill unpaid. The bill and its other payments stay intact.'
              : "This can't be undone."
          })()}
          confirmLabel="Delete"
          onConfirm={() => {
            const tx = pendingDelete
            setPendingDelete(null)
            handleDeleteTransaction(tx.id)
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  )
}