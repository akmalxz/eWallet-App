// src/components/dashboard/ActionLedger.jsx
import { useState, useMemo } from 'react'
import {
  ArrowDownRight, ArrowUpRight, RefreshCw,
  Trash2, Edit2, Plus, Inbox, Calendar, ChevronDown, ChevronUp, Search, X, Loader2
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { toMYDate, dayKey } from '../../utils/dateHelpers'
import { getColorTheme } from '../../utils/theme/themeRegistry'
import { ConfirmSheet } from '../shared/ConfirmSheet'
import { ModalWrapper } from '../modals/ModalWrapper'
import { LedgerEditForm } from './LedgerEditForm'
import { Collapse } from '../shared/Collapse'

// ... (Keep formatGroupLabel, getDailyTotals, AccountPill exactly the same) ...

const formatGroupLabel = (dateKey, todayKey, yesterdayKey) => {
  if (dateKey === todayKey) return 'Today'
  if (dateKey === yesterdayKey) return 'Yesterday'
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const isThisYear = y === toMYDate(new Date()).getUTCFullYear()
  return date.toLocaleDateString('en-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: isThisYear ? undefined : 'numeric',
    timeZone: 'UTC'
  })
}

const getDailyTotals = (transactions) => {
  let moneyIn = 0
  let moneyOut = 0
  for (const tx of transactions) {
    const hasSource = !!tx.source_account_id
    const hasDest = !!tx.destination_account_id
    const amt = Number(tx.amount) || 0
    if (hasSource && hasDest) continue
    if (!hasSource && hasDest) moneyIn += amt
    else if (hasSource && !hasDest) moneyOut += amt
  }
  return { moneyIn, moneyOut }
}

const AccountPill = ({ account }) => {
  if (!account) return <span className="text-[10px] text-fg-subtle">Unknown</span>
  const theme = getColorTheme(account.color_theme)
  const [c1, c2] = theme.gradient
  const textColor = theme.tone === 'light' ? '#ffffff' : '#0f172a'

  return (
    <span
      className="inline-flex items-center px-1.5 py-[2px] rounded text-[9px] font-bold max-w-[100px] truncate leading-none"
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, color: textColor }}
    >
      {account.account_name}
    </span>
  )
}

export const ActionLedger = ({
  recentTransactions,
  mainCategories,
  getSubCategories,
  handleDeleteTransaction,
  handleEditTransaction,
  onRefresh,
  isRefreshing,
  accounts,
  onAddTransaction,
  searchQuery,
  onSearchChange,
  hasMore,
  onLoadMore,
  isLoadingMore,
  isSearching // <-- Added
}) => {
  const [editingTx, setEditingTx] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [pendingDelete, setPendingDelete] = useState(null)

  const groupedTransactions = useMemo(() => {
    if (!recentTransactions || recentTransactions.length === 0) return []
    const todayKey = dayKey(new Date())
    const yesterdayKey = dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000))
    const groups = {}

    recentTransactions.forEach((tx) => {
      const dateKey = dayKey(tx.transaction_date || tx.created_at)
      const label = formatGroupLabel(dateKey, todayKey, yesterdayKey)
      if (!groups[dateKey]) {
        groups[dateKey] = { label, date: dateKey, isToday: dateKey === todayKey, transactions: [] }
      }
      groups[dateKey].transactions.push(tx)
    })

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
  }, [recentTransactions])

  const toggleGroup = (dateKey) => {
    setExpandedGroups((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }))
  }

  const isGroupExpanded = (group) => {
    if (group.isToday) return true
    return expandedGroups[group.date] ?? false
  }

  const beginEdit = (tx) => setEditingTx(tx)
  const endEdit = () => setEditingTx(null)
  const accountFor = (id) => accounts.find((a) => a.id === id)

  // Only show full empty state if NOT searching
  if (!recentTransactions || recentTransactions.length === 0) {
    if (!searchQuery && !isSearching) {
      return (
        <section className="flex flex-col items-center justify-center p-12 text-fg-subtle border border-dashed border-line-strong rounded-3xl">
          <div className="w-14 h-14 bg-surface-2 border border-line rounded-2xl flex items-center justify-center mb-4 text-fg-subtle">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-fg">No Transactions Found</p>
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
        </section>
      )
    }
  }

  return (
    <>
      <section className="flex flex-col flex-1">
        {/* Header and Search Bar (same as before) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-bold text-fg tracking-tight flex items-center gap-2">
            Action Ledger
            <span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle bg-surface-2 px-2 py-0.5 rounded-md">
              {recentTransactions?.length || 0}
            </span>
          </h2>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search all transactions..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-surface-2 border border-line rounded-xl py-2 pl-9 pr-8 text-xs text-fg placeholder:text-fg-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-fg-subtle hover:text-fg"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all border border-line ${
                isRefreshing
                  ? 'text-fg-subtle/50 cursor-not-allowed bg-surface-2'
                  : 'text-fg-muted hover:text-fg hover:bg-surface-2 bg-surface'
              }`}
              title="Refresh transactions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-2xl overflow-hidden flex flex-col flex-1 max-h-[60vh]">
          <div className="overflow-y-auto overscroll-contain scrollbar-thin flex-1">
            {isSearching ? (
              // Show a clean spinner instead of the empty state while searching/loading
              <div className="p-8 flex flex-col items-center justify-center h-full text-fg-subtle">
                <Loader2 className="w-6 h-6 animate-spin mb-3" />
                <p className="text-sm font-bold text-fg">
                  {searchQuery.trim() ? 'Searching...' : 'Loading transactions...'}
                </p>
              </div>
            ) : groupedTransactions.length === 0 ? (
              // Empty state INSIDE the list container so search bar remains
              <div className="p-8 text-center text-fg-subtle h-full flex flex-col items-center justify-center">
                <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-fg">No results found</p>
                <p className="text-xs mt-1">Try a different search term or clear the search.</p>
                <button
                  onClick={() => onSearchChange('')}
                  className="mt-4 inline-flex items-center justify-center px-4 py-2 bg-surface-2 border border-line hover:bg-surface-3 text-fg text-xs font-bold rounded-lg transition-colors"
                >
                  Clear search
                </button>
              </div>
            ) : (
              groupedTransactions.map((group) => {
                const { moneyIn, moneyOut } = getDailyTotals(group.transactions)
                const hasFlow = moneyIn > 0 || moneyOut > 0
                const isToday = group.isToday
                const isExpanded = isGroupExpanded(group)

                return (
                  <div key={group.date} className="border-b border-line last:border-0">
                    {/* GROUP HEADER */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-2 transition-colors select-none sticky top-0 bg-surface/95 backdrop-blur-sm z-10 border-b border-line/50"
                      onClick={() => toggleGroup(group.date)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Calendar className="w-3.5 h-3.5 text-fg-subtle shrink-0" />
                        <span className={`text-xs font-bold truncate ${isToday ? 'text-brand' : 'text-fg'}`}>
                          {group.label}
                        </span>
                        {!isExpanded && (
                          <span className="text-[10px] font-medium text-fg-subtle shrink-0">
                            ({group.transactions.length})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {hasFlow && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-tight tabular-figures">
                            {moneyIn > 0 && <span className="text-success">+{formatMYR(moneyIn)}</span>}
                            {moneyIn > 0 && moneyOut > 0 && <span className="text-line-strong font-normal">·</span>}
                            {moneyOut > 0 && <span className="text-fg">-{formatMYR(moneyOut)}</span>}
                          </div>
                        )}
                        <div className="text-fg-subtle">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>

                    {/* GROUP ROWS */}
                    <Collapse open={isExpanded}>
                      <div className="divide-y divide-line bg-surface-2/30">
                        {group.transactions.map((tx) => {
                          const isIncome = !tx.source_account_id && tx.destination_account_id
                          const isTransfer = tx.source_account_id && tx.destination_account_id
                          const globalIndex = recentTransactions.findIndex((t) => t.id === tx.id)

                          const srcAcc = accountFor(tx.source_account_id)
                          const destAcc = accountFor(tx.destination_account_id)

                          return (
                            <div
                              key={tx.id}
                              id={`tx-${globalIndex}`}
                              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2 transition-all animate-enter"
                            >
                              <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <p className="text-sm font-bold text-fg truncate">
                                  {tx.description}
                                </p>
                                
                                <div className="flex items-center gap-1.5 text-[11px] text-fg-subtle min-w-0">
                                  <span className="truncate max-w-[80px] sm:max-w-[120px]">
                                    {tx.category || 'Uncategorized'}
                                  </span>
                                  <span className="text-line-strong shrink-0">•</span>
                                  
                                  <div className="flex items-center gap-1 min-w-0 truncate">
                                    {isIncome && destAcc && (
                                      <>
                                        <span className="text-fg-subtle font-bold">→</span>
                                        <AccountPill account={destAcc} />
                                      </>
                                    )}
                                    {isTransfer && srcAcc && destAcc && (
                                      <>
                                        <AccountPill account={srcAcc} />
                                        <span className="text-fg-subtle font-bold">→</span>
                                        <AccountPill account={destAcc} />
                                      </>
                                    )}
                                    {!isIncome && !isTransfer && srcAcc && (
                                      <>
                                        <span className="text-fg-subtle font-bold">←</span>
                                        <AccountPill account={srcAcc} />
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={`text-sm font-bold tabular-figures whitespace-nowrap ${
                                  isIncome ? 'text-success' : isTransfer ? 'text-fg-muted' : 'text-fg'
                                }`}>
                                  {isIncome ? '+' : isTransfer ? '' : '-'}{formatMYR(tx.amount)}
                                </span>
                                
                                <div className="ml-auto flex items-center justify-end gap-1 opacity-100 transition-opacity">
                                  <button
                                    onClick={() => beginEdit(tx)}
                                    className="w-7 h-7 flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-3 rounded-md transition-all"
                                    aria-label="Edit transaction"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => setPendingDelete(tx)}
                                    className="w-7 h-7 flex items-center justify-center text-fg-subtle hover:text-danger hover:bg-danger-soft rounded-md transition-all"
                                    aria-label="Delete transaction"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </Collapse>
                  </div>
                )
              })
            )}
          </div>

          {hasMore && !isSearching && (
            <div className="p-3 border-t border-line bg-surface flex justify-center shrink-0">
              <button
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-fg bg-surface-2 border border-line hover:bg-surface-3 transition-colors disabled:opacity-50"
                style={{ minHeight: 44 }}
              >
                {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isLoadingMore ? 'Loading more...' : 'Load More Transactions'}
              </button>
            </div>
          )}
        </div>
      </section>

      {editingTx && (
        <ModalWrapper title="Edit Transaction" closeModal={endEdit}>
          <LedgerEditForm
            transaction={editingTx}
            accounts={accounts}
            mainCategories={mainCategories}
            getSubCategories={getSubCategories}
            onSave={(updates) => {
              handleEditTransaction(editingTx.id, updates)
              endEdit()
            }}
            onCancel={endEdit}
          />
        </ModalWrapper>
      )}

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