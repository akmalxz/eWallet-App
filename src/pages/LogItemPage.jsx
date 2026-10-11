// src/pages/LogItemPage.jsx
import { PlusCircle, Wallet } from 'lucide-react'
import { TransactionForm } from '../components/transactions/TransactionForm'

export function LogItemPage({
  user,
  accounts,
  onAddAccount,
  mainCategories,
  getSubCategories,
  fetchAllData,
  showToast
}) {
  // ─────────────────────────────────────────────────────────────
  // Empty state — no accounts, form would fail on submit
  // ─────────────────────────────────────────────────────────────
  if (!accounts || accounts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        <div className="hidden md:block mb-5 px-1">
          <h1 className="text-xl font-bold text-fg tracking-tight">Manual Entry</h1>
          <p className="text-xs text-fg-subtle mt-1">Record a new income, expense, or transfer</p>
        </div>

        <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-surface-2 border border-line rounded-2xl flex items-center justify-center mx-auto mb-4 text-fg-subtle">
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
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="hidden md:block mb-5 px-1">
        <h1 className="text-xl font-bold text-fg tracking-tight">Manual Entry</h1>
        <p className="text-xs text-fg-subtle mt-1">Record a new income, expense, or transfer</p>
      </div>

      <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl overflow-hidden shadow-sm p-5">
        <TransactionForm
          user={user}
          accounts={accounts}
          mainCategories={mainCategories}
          getSubCategories={getSubCategories}
          fetchAllData={fetchAllData}
          showToast={showToast}
        />
      </div>
    </div>
  )
}