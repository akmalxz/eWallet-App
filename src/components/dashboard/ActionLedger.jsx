// src/components/dashboard/ActionLedger.jsx
import { useState, useMemo } from 'react'
import {
  ArrowDownRight, ArrowUpRight, RefreshCw, List,
  Trash2, Edit2, Plus, Inbox, Calendar, ChevronDown, ChevronUp
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { toMYDate, dayKey } from '../../utils/dateHelpers'
import { AccountCard } from '../shared/AccountCard'
import { ConfirmSheet } from '../shared/ConfirmSheet'
import { LedgerEditForm } from './LedgerEditForm'

// Format a YYYY-MM-DD MY date key as a compact group label.
// "Today" / "Yesterday" for the last two days; otherwise "Wed, 15 Oct",
// dropping the year for the current MY year.
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

// Sum money-in (income) and money-out (expense) for a day's transactions.
// Transfers (both source and destination set) are neither — excluded from
// both totals.
const getDailyTotals = (transactions) => {
  let moneyIn = 0
  let moneyOut = 0
  for (const tx of transactions) {
    const hasSource = !!tx.source_account_id
    const hasDest = !!tx.destination_account_id
    const amt = Number(tx.amount) || 0
    if (hasSource && hasDest) continue          // transfer
    if (!hasSource && hasDest) moneyIn += amt   // income
    else if (hasSource && !hasDest) moneyOut += amt // expense
  }
  return { moneyIn, moneyOut }
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
  onAddTransaction
}) => {
  const [editingId, setEditingId] = useState(null)
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
        groups[dateKey] = {
          label,
          date: dateKey,
          isToday: dateKey === todayKey,
          transactions: []
        }
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

  // Parent-side: track which transaction's form is open.
  // Everything else about editing lives inside LedgerEditForm.
  const beginEdit = (id) => setEditingId(id)
  const endEdit = () => setEditingId(null)

  const accountFor = (id) => accounts.find((a) => a.id === id)

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
            const { moneyIn, moneyOut } = getDailyTotals(group.transactions)
            const hasFlow = moneyIn > 0 || moneyOut > 0
            const isToday = group.isToday
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
                    {hasFlow && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold whitespace-nowrap">
                        {moneyIn > 0 && (
                          <span className="text-success">+{formatMYR(moneyIn)}</span>
                        )}
                        {moneyIn > 0 && moneyOut > 0 && (
                          <span className="text-fg-subtle font-normal">·</span>
                        )}
                        {moneyOut > 0 && (
                          <span className="text-fg">-{formatMYR(moneyOut)}</span>
                        )}
                      </div>
                    )}
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
                      const isEditingThis = editingId === tx.id
                      const globalIndex = recentTransactions.findIndex((t) => t.id === tx.id)

                      return (
                        <div
                          key={tx.id}
                          className="relative overflow-hidden rounded-xl border border-line bg-surface"
                        >
                          {isEditingThis && (
                            <LedgerEditForm
                              key={tx.id}
                              transaction={tx}
                              accounts={accounts}
                              mainCategories={mainCategories}
                              getSubCategories={getSubCategories}
                              onSave={(updates) => {
                                handleEditTransaction(tx.id, updates)
                                endEdit()
                              }}
                              onCancel={endEdit}
                            />
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
                                    onClick={() => beginEdit(tx.id)}
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