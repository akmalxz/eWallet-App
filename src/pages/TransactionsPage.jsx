// src/pages/TransactionsPage.jsx
import { useState } from 'react'
import { ScanText, AlertTriangle, Check, RefreshCw, X } from 'lucide-react'
import { ActionLedger } from '../components/dashboard/ActionLedger'
import { ConfirmSheet } from '../components/shared/ConfirmSheet'
import { formatMYR } from '../utils/formatters'

const sortNewestFirst = (a, b) => {
  const aTxTime = new Date(a.transaction_date || a.created_at || 0).getTime()
  const bTxTime = new Date(b.transaction_date || b.created_at || 0).getTime()
  if (aTxTime !== bTxTime) return bTxTime - aTxTime

  const aCreated = new Date(a.created_at || 0).getTime()
  const bCreated = new Date(b.created_at || 0).getTime()
  return bCreated - aCreated
}

export function TransactionsPage({
  user,
  accounts,
  mainCategories,
  getSubCategories,
  fetchAllData,
  showToast,
  recentTransactions,
  handleApproveTransaction,
  handleDeleteTransaction,
  handleEditTransaction,
  onRefresh,
  isRefreshing,
  onAddTransaction
}) {
  const [pendingDelete, setPendingDelete] = useState(null)

  const pendingTransactions = (recentTransactions?.filter((tx) => tx.needs_review) || [])
    .sort(sortNewestFirst)

  const verifiedTransactions = (recentTransactions?.filter((tx) => !tx.needs_review) || [])
    .sort(sortNewestFirst)

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 space-y-4">

      <div className="hidden md:block mb-5 px-1">
        <h1 className="text-xl font-bold text-fg tracking-tight">
          Ledger & Verification
        </h1>
        <p className="text-xs text-fg-subtle mt-1">
          Review OCR scans and manage your transaction history
        </p>
      </div>

      <section className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-2.5 rounded-xl transition-all duration-300 ${
              pendingTransactions.length > 0
                ? 'bg-warning-solid text-white shadow-md'
                : 'bg-surface-2 text-fg-muted'
            }`}
          >
            <ScanText className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-fg">OCR Verification</span>
            {pendingTransactions.length > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-warning-soft text-warning-text">
                {pendingTransactions.length}
              </span>
            )}
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`ml-auto w-11 h-11 flex items-center justify-center rounded-lg transition-all ${
              isRefreshing
                ? 'text-fg-subtle/50 cursor-not-allowed'
                : 'text-fg-subtle hover:text-fg-muted hover:bg-surface-2'
            }`}
            title="Refresh OCR scans"
            aria-label="Refresh OCR scans"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {pendingTransactions.length === 0 ? (
          <div className="text-center p-6 text-fg-muted text-sm">
            <ScanText className="w-8 h-8 text-fg-subtle mx-auto mb-2" />
            No pending OCR scans to verify.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTransactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-warning-soft/80 border border-warning-border/50 rounded-2xl p-4 shadow-sm relative"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="pr-4">
                    <p className="text-sm font-bold text-warning-text leading-tight">
                      {tx.description}
                    </p>
                    <p className="text-xs text-warning-text/90 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Pending Verification
                    </p>
                  </div>
                  <span className="text-sm font-bold text-fg whitespace-nowrap">
                    {formatMYR(tx.amount)}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="date"
                    id={`date-select-${tx.id}`}
                    name={`date-select-${tx.id}`}
                    aria-label="Transaction Date"
                    defaultValue={
                      new Date(tx.transaction_date || tx.created_at)
                        .toISOString()
                        .split('T')[0]
                    }
                    className="bg-surface border border-warning-border text-xs rounded-xl px-2.5 py-1.5 text-fg outline-none focus:border-warning focus:ring-2 focus:ring-warning/30"
                  />
                  <select
                    id={`cat-select-${tx.id}`}
                    name={`cat-select-${tx.id}`}
                    aria-label="Transaction Category"
                    defaultValue={tx.category}
                    className="flex-1 bg-surface border border-warning-border text-xs rounded-xl px-2 py-1.5 text-fg outline-none focus:border-warning focus:ring-2 focus:ring-warning/30"
                  >
                    <option value="uncategorized">Select Category...</option>
                    {mainCategories.map((main) => (
                      <optgroup key={main.id} label={main.name}>
                        {getSubCategories(main.id).map((sub) => (
                          <option key={sub.id} value={`${main.name} > ${sub.name}`}>
                            {sub.name}
                          </option>
                        ))}
                        {getSubCategories(main.id).length === 0 && (
                          <option value={main.name}>{main.name} (General)</option>
                        )}
                      </optgroup>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5 flex-1">
                    <button
                      onClick={() =>
                        handleApproveTransaction(
                          tx.id,
                          document.getElementById(`cat-select-${tx.id}`).value,
                          document.getElementById(`date-select-${tx.id}`).value
                        )
                      }
                      aria-label="Approve Transaction"
                      title="Approve transaction"
                      className="flex-1 bg-warning-solid hover:bg-warning-solid-hover text-white p-2 rounded-xl transition-colors shadow-sm flex items-center justify-center"
                      style={{ minHeight: 44 }}
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setPendingDelete(tx)}
                      aria-label="Delete scan"
                      title="Delete scan"
                      className="flex-1 bg-surface hover:bg-danger-soft text-danger border border-danger-border p-2 rounded-xl transition-colors shadow-sm flex items-center justify-center"
                      style={{ minHeight: 44 }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-3 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
        <ActionLedger
          recentTransactions={verifiedTransactions}
          mainCategories={mainCategories}
          getSubCategories={getSubCategories}
          handleApproveTransaction={handleApproveTransaction}
          handleDeleteTransaction={handleDeleteTransaction}
          handleEditTransaction={handleEditTransaction}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          accounts={accounts}
          onAddTransaction={onAddTransaction}
        />
      </div>

      {pendingDelete && (
        <ConfirmSheet
          destructive
          title={`Delete "${pendingDelete.description || 'scan'}"?`}
          message="This pending OCR scan will be removed. You can re-scan it later if needed."
          confirmLabel="Delete"
          onConfirm={() => {
            const tx = pendingDelete
            setPendingDelete(null)
            handleDeleteTransaction(tx.id)
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}