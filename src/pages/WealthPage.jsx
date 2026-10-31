// src/pages/WealthPage.jsx
import { useState } from 'react'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { NetWorthHistoryChart } from '../components/wealth/NetWorthHistoryChart'
import { NetWorthSummary } from '../components/wealth/NetWorthSummary'
import { AssetGrowthBreakdown } from '../components/wealth/AssetGrowthBreakdown'
import { useWealthHistory } from '../hooks/useWealthHistory'

export function WealthPage({ user, accounts = [], onBack }) {
  const [showBalances, setShowBalances] = useState(() => {
    try {
      const stored = localStorage.getItem('hideBalances')
      return stored !== null ? stored === 'false' : true
    } catch {
      return true
    }
  })

  const toggleBalances = () => {
    setShowBalances((prev) => {
      const next = !prev
      try { localStorage.setItem('hideBalances', String(!next)) } catch {}
      return next
    })
  }

  const { history, monthDelta, loading } = useWealthHistory(user, accounts)

  const primaryAsbAccount = accounts
    .filter(a => !a.is_archived && a.classification === 'fixed_price_ut')
    .sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0))[0]

  return (
    <div className="max-w-2xl mx-auto animate-enter pb-12 space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-bold text-fg-muted hover:text-fg transition-colors"
        style={{ minHeight: 44 }}
      >
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-fg tracking-tight">Wealth</h1>
          <p className="text-xs text-fg-subtle mt-1">Your net worth across all accounts</p>
        </div>
        <button
          onClick={toggleBalances}
          aria-pressed={!showBalances}
          className="flex items-center justify-center gap-1.5 text-xs text-fg-subtle hover:text-fg-muted transition-colors px-3 py-2 rounded-lg hover:bg-surface-2 shrink-0"
          style={{ minHeight: 44 }}
        >
          {showBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{showBalances ? 'Hide' : 'Show'} amounts</span>
        </button>
      </div>

      <NetWorthHistoryChart
        history={history}
        monthDelta={monthDelta}
        hideMoney={!showBalances}
        loading={loading}
      />

      <NetWorthSummary
        accounts={accounts}
        hideMoney={!showBalances}
        delta={monthDelta}
      />

      {primaryAsbAccount && (
        <AssetGrowthBreakdown
          user={user}
          account={primaryAsbAccount}
          hideMoney={!showBalances}
        />
      )}
    </div>
  )
}