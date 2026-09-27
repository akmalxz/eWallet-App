// src/pages/TransactionsPage.jsx
import { ScanText, AlertTriangle, Check } from 'lucide-react'
import { ActionLedger } from '../components/dashboard/ActionLedger'
import { formatMYR } from '../utils/formatters'

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
  // Extract Pending OCR items vs Verified Ledger items
  const pendingTransactions = recentTransactions?.filter(tx => tx.needs_review) || []
  const verifiedTransactions = recentTransactions?.filter(tx => !tx.needs_review) || []

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 space-y-4">

      {/* Page Header */}
      <div className="mb-5 px-1">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Ledger & Verification</h1>
        <p className="text-xs text-slate-400 mt-1">Review OCR scans and manage your transaction history</p>
      </div>

      {/* SECTION 1: OCR VERIFICATION */}
      <section className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2.5 rounded-xl transition-all duration-300 ${
            pendingTransactions.length > 0
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-slate-100 text-slate-500'
          }`}>
            <ScanText className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-slate-800">OCR Verification</span>
            {pendingTransactions.length > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {pendingTransactions.length}
              </span>
            )}
          </div>
        </div>

        {pendingTransactions.length === 0 ? (
          <div className="text-center p-6 text-slate-500 text-sm">
            <ScanText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No pending OCR scans to verify.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTransactions.map(tx => (
              <div key={tx.id} className="bg-amber-50/80 border border-amber-200/50 rounded-2xl p-4 shadow-sm relative">
                <div className="flex justify-between items-start mb-3">
                  <div className="pr-4">
                    <p className="text-sm font-bold text-amber-900 leading-tight">{tx.description}</p>
                    <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3"/> Pending Verification
                    </p>
                  </div>
                  <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{formatMYR(tx.amount)}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="date"
                    id={`date-select-${tx.id}`}
                    name={`date-select-${tx.id}`}
                    aria-label="Transaction Date"
                    defaultValue={new Date(tx.transaction_date || tx.created_at).toISOString().split('T')[0]}
                    className="bg-white/80 border border-amber-200 text-xs rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <select
                    id={`cat-select-${tx.id}`}
                    name={`cat-select-${tx.id}`}
                    aria-label="Transaction Category"
                    defaultValue={tx.category}
                    className="flex-1 bg-white/80 border border-amber-200 text-xs rounded-xl px-2 py-1.5 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="uncategorized">Select Category...</option>
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
                      document.getElementById(`cat-select-${tx.id}`).value,
                      document.getElementById(`date-select-${tx.id}`).value
                    )}
                    aria-label="Approve Transaction"
                    className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-xl transition-colors shadow-sm flex items-center justify-center shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 4: ACTION LEDGER */}
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

    </div>
  )
}