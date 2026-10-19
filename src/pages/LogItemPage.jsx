// src/pages/LogItemPage.jsx
import { PlusCircle, Wallet } from 'lucide-react'
import { TransactionForm } from '../components/transactions/TransactionForm'

export function LogItemPage({
  user,
  accounts,
  onAddAccount,
  mainCategories,
  getSubCategories,
  fetchAccounts,           // <-- Added
  fetchRecentTransactions, // <-- Added
  fetchMonthlyData,        // <-- Added
  showToast
}) {
  if (!accounts || accounts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto animate-enter pb-12">
        <div className="hidden md:block mb-5 px-1">
          <h1 className="text-xl font-bold text-fg tracking-tight">Manual Entry</h1>
          <p className="text-xs text-fg-subtle mt-1">Record a new income, expense, or transfer</p>
        </div>

        <div className="border border-dashed border-line-strong rounded-2xl p-8 text-center bg-surface-2/30">
          <div className="w-14 h-14 bg-surface border border-line rounded-2xl flex items-center justify-center mx-auto mb-4 text-fg-subtle">
            <Wallet className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-fg">No accounts yet</p>
          <p className="text-xs text-fg-subtle mt-1 max-w-[280px] mx-auto leading-relaxed">
            Every transaction needs an account. Add your first one to get started.
          </p>
          {onAddAccount && (
            <button
              type="button"
              onClick={onAddAccount}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-brand-solid hover:bg-brand-solid-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              style={{ minHeight: 44 }}
            >
              <PlusCircle className="w-4 h-4" /> Add Account
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-enter pb-12">
      <div className="hidden md:block mb-5 px-1">
        <h1 className="text-xl font-bold text-fg tracking-tight">Manual Entry</h1>
        <p className="text-xs text-fg-subtle mt-1">Record a new income, expense, or transfer</p>
      </div>

      <TransactionForm
        user={user}
        accounts={accounts}
        mainCategories={mainCategories}
        getSubCategories={getSubCategories}
        fetchAccounts={fetchAccounts}
        fetchRecentTransactions={fetchRecentTransactions}
        fetchMonthlyData={fetchMonthlyData}
        showToast={showToast}
      />
    </div>
  )
}