// src/pages/WealthPage.jsx
import { useState } from 'react'
import { ChevronLeft, Eye, EyeOff, AlertCircle, Wallet, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { NetWorthHistoryChart } from '../components/wealth/NetWorthHistoryChart'
import { NetWorthSummary } from '../components/wealth/NetWorthSummary'
import { SavingsRateCard } from '../components/wealth/SavingsRateCard'
import { AssetGrowthBreakdown } from '../components/wealth/AssetGrowthBreakdown'
import { WealthInfo } from '../components/wealth/WealthInfo'
import { EmptyState } from '../components/analytics/AnalyticsShared'
import { useWealthHistory } from '../hooks/useWealthHistory'
import { useSavingsRate } from '../hooks/useSavingsRate'
import { formatMYR } from '../utils/formatters'

export function WealthPage({
  user,
  accounts = [],
  monthlyExpenses = [],
  monthlyInflows = [],
  profile,
  onBack,
  onAddAccount
}) {
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

  const { history, monthDelta, loading, error } = useWealthHistory(user, accounts)

  const savingsRate = useSavingsRate({
    transactions: monthlyExpenses || [],
    inflows: monthlyInflows || [],
    accounts,
    profile
  })

  const activeAccounts = accounts.filter(a => !a.is_archived)
  const hasAccounts = activeAccounts.length > 0

  const primaryAsbAccount = accounts
    .filter(a => !a.is_archived && a.classification === 'fixed_price_ut')
    .sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0))[0]

  const current = history[history.length - 1]?.netWorth || 0
  const isNegative = current < 0

  const deltaUp = monthDelta && monthDelta.value > 0.01
  const deltaDown = monthDelta && monthDelta.value < -0.01
  const DeltaIcon = deltaUp ? TrendingUp : deltaDown ? TrendingDown : Minus
  const deltaColor = deltaUp ? 'text-success' : deltaDown ? 'text-danger' : 'text-fg-subtle'

  return (
    <div className="max-w-2xl mx-auto animate-enter pb-12 space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-bold text-fg-muted hover:text-fg transition-colors px-1"
        style={{ minHeight: 44 }}
      >
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-fg tracking-tight">Wealth</h1>
          <p className="text-xs text-fg-subtle mt-1">Your net worth across all accounts</p>
        </div>
        {hasAccounts && (
          <button
            onClick={toggleBalances}
            aria-pressed={!showBalances}
            className="flex items-center justify-center gap-1.5 text-xs text-fg-subtle hover:text-fg-muted transition-colors px-3 py-2 rounded-lg hover:bg-surface-2 shrink-0"
            style={{ minHeight: 44 }}
          >
            {showBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showBalances ? 'Hide' : 'Show'} amounts</span>
          </button>
        )}
      </div>

      {hasAccounts && <div className="px-1"><WealthInfo /></div>}

      {error && (
        <div className="bg-danger-soft border border-danger-border rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-danger-text">Couldn't load wealth data</p>
            <p className="text-xs text-danger-text/90 mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {!hasAccounts && (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          message="Add your first account to start tracking your net worth and wealth growth."
          action={onAddAccount ? {
            label: 'Add account',
            onClick: onAddAccount
          } : undefined}
        />
      )}

      {hasAccounts && (
        <>
          {/* UNIFIED HERO + CHART SECTION */}
          <section className="px-1">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 md:gap-0 mb-2">
              <div>
                <p className="text-[10px] text-fg-subtle uppercase font-bold tracking-wider mb-1">
                  Total Net Worth
                </p>
                <p
                  className={`text-4xl font-black tracking-tighter tabular-figures ${
                    isNegative ? 'text-danger' : 'text-fg'
                  }`}
                >
                  {showBalances ? formatMYR(current) : '••••••'}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  <p className="text-[11px] text-fg-muted">
                    Across {activeAccounts.length} {activeAccounts.length === 1 ? 'account' : 'accounts'}
                  </p>
                  {monthDelta && (
                    <div className="flex items-center gap-3">
                      <span className="text-line-strong hidden sm:inline">·</span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${deltaColor}`}>
                        <DeltaIcon className="w-3 h-3" />
                        {showBalances
                          ? `${deltaUp ? '+' : deltaDown ? '−' : ''}${formatMYR(Math.abs(monthDelta.value))}`
                          : '••••'}
                        <span className="text-fg-subtle font-medium">this month</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Chart Label: left aligned on mobile, right aligned on desktop */}
              <div className="md:text-right md:pt-1">
                <p className="text-xs font-bold text-fg">Net worth trend</p>
                <p className="text-[10px] text-fg-subtle mt-0.5">Last 6 months</p>
              </div>
            </div>

            {/* Chart sits flush below the number. mt-4 on mobile to give space after the label */}
            <div className="-mx-2 md:mx-0 mt-4 md:mt-2">
              <NetWorthHistoryChart
                history={history}
                hideMoney={!showBalances}
                loading={loading}
              />
            </div>
          </section>

          {/* SUMMARY LIST */}
          <section className="px-1">
            <NetWorthSummary
              accounts={accounts}
              hideMoney={!showBalances}
            />
          </section>

          {/* SAVINGS RATE */}
          <section className="px-1">
            <SavingsRateCard
              data={savingsRate}
              hideMoney={!showBalances}
            />
          </section>

          {/* GROWTH BREAKDOWN */}
          {primaryAsbAccount && (
            <section className="px-1">
              <AssetGrowthBreakdown
                user={user}
                account={primaryAsbAccount}
                hideMoney={!showBalances}
              />
            </section>
          )}
        </>
      )}
    </div>
  )
}