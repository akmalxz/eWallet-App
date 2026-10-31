// src/pages/DashboardPage.jsx
import { useState } from 'react'
import { Receipt, Users, TrendingUp } from 'lucide-react'
import { AccountCards } from '../components/dashboard/AccountCards'
import { BurnRateWidget } from '../components/dashboard/BurnRateWidget'
import { CashFlowHeatmap } from '../components/dashboard/CashFlowHeatmap'
import { AccountChipRow } from '../components/shared/AccountChipRow'
import { AccountSelector } from '../components/shared/AccountSelector'
import { OnboardingChecklist } from '../components/dashboard/OnboardingChecklist'
import { useFriendRequests } from '../hooks/useFriendRequests'
import { useOnboardingProgress } from '../hooks/useOnboardingProgress'
import { trackEvent } from '../lib/analytics'
import { SavingsMigrationPrompt } from '../components/wealth/SavingsMigrationPrompt'

export function DashboardPage({
  user,
  profile,
  refreshProfile,
  recentTransactions,
  commitments,
  isLoading,
  accounts,
  activeAccounts,
  allAccounts,
  classifications,
  homeAccountId,
  onHomeAccountChange,
  velocityStats,
  cashFlowData,
  monthlyExpenses,
  monthlyInflows,
  onAddAccount,
  onLogTransaction,
  onManageAccount,
  onTogglePin,
  onMoveAccount,
  onSeeTrends,
  onOpenBurnRateHelp,
  onNavigate,
  showToast,
  fetchRecentTransactions,
  fetchAccounts,
  fetchMonthlyData
}) {
  const { friends } = useFriendRequests(user)

  const onboarding = useOnboardingProgress({
    user,
    profile,
    recentTransactions,
    commitments,
    friends,
    refreshProfile,
  })

  // Global Privacy State
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
      try {
        localStorage.setItem('hideBalances', String(!next))
      } catch {}
      return next
    })
  }

  const handleStepClick = (stepId) => {
    trackEvent('onboarding_step_clicked', { step: stepId })
    switch (stepId) {
      case 'transaction': onNavigate('log');         break
      case 'bill':        onNavigate('commitments'); break
      case 'username':    onNavigate('profile');     break
      case 'friend':      onNavigate('network');     break
    }
  }

  return (
    <div className="space-y-8 md:space-y-12 animate-enter">

      <SavingsMigrationPrompt
        user={user}
        transactions={recentTransactions}
        accounts={accounts}
        showToast={showToast}
        fetchRecentTransactions={fetchRecentTransactions}
        fetchAccounts={fetchAccounts}
        fetchMonthlyData={fetchMonthlyData}
      />

      {/* ONBOARDING CHECKLIST */}
      {onboarding.shouldShow && !isLoading && (
        <OnboardingChecklist
          steps={onboarding.steps}
          completedCount={onboarding.completedCount}
          totalCount={onboarding.totalCount}
          onStepClick={handleStepClick}
          onDismiss={onboarding.dismiss}
        />
      )}

      {/* WALLET CARDS */}
      <section>
        {isLoading ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="h-3 w-20 bg-surface-3 rounded-full animate-pulse" />
              <span className="h-3 w-24 bg-surface-3 rounded-full animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-gradient-to-br from-surface-2 to-surface-3 animate-pulse h-[190px]"
                />
              ))}
            </div>
          </div>
        ) : (
          <AccountCards
            accounts={accounts}
            classifications={classifications}
            onAddAccount={onAddAccount}
            onLogTransaction={onLogTransaction}
            onManageAccount={onManageAccount}
            onTogglePin={onTogglePin}
            onMoveAccount={onMoveAccount}
            showBalances={showBalances}
            onToggleBalances={toggleBalances}
          />
        )}
      </section>

      {/* QUICK ACTIONS TOOLBAR */}
      <section className="relative z-10 bg-surface border border-line/60 rounded-2xl overflow-hidden flex divide-x divide-line shadow-sm">
        <button
          onClick={() => onNavigate('network')}
          className="flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 hover:bg-surface-2 transition-colors group"
        >
          <Users className="w-4 h-4 text-fg-muted group-hover:text-fg transition-colors" />
          <span className="text-[10px] font-bold text-fg-muted uppercase tracking-wider group-hover:text-fg transition-colors">Network</span>
        </button>

        <button
          onClick={() => onNavigate('split')}
          className="flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 hover:bg-surface-2 transition-colors group"
        >
          <Receipt className="w-4 h-4 text-fg-muted group-hover:text-fg transition-colors" />
          <span className="text-[10px] font-bold text-fg-muted uppercase tracking-wider group-hover:text-fg transition-colors">Split Bill</span>
        </button>

        {/* NEW */}
        <button
          onClick={() => onNavigate('wealth')}
          className="flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 hover:bg-surface-2 transition-colors group"
        >
          <TrendingUp className="w-4 h-4 text-fg-muted group-hover:text-fg transition-colors" />
          <span className="text-[10px] font-bold text-fg-muted uppercase tracking-wider group-hover:text-fg transition-colors">Wealth</span>
        </button>
      </section>

      {/* THIS MONTH */}
      <section className="pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xs font-bold text-fg-subtle uppercase tracking-wider">
            This month
          </h2>

          <div className="w-full md:w-auto">
            <div className="hidden md:block">
              <AccountChipRow
                accounts={activeAccounts}
                value={homeAccountId}
                onChange={onHomeAccountChange}
              />
            </div>
            <div className="md:hidden">
              <AccountSelector
                accounts={activeAccounts}
                value={homeAccountId}
                onChange={onHomeAccountChange}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:divide-x lg:divide-line/60">
          <div className="lg:pr-6">
            <BurnRateWidget
              velocityStats={velocityStats}
              isLoading={isLoading}
              onSeeTrends={() => onSeeTrends('overview')}
              onOpenHelp={onOpenBurnRateHelp}
              hideFreeMoney={!showBalances}
            />
          </div>
          <div className="lg:pl-6">
            <CashFlowHeatmap
              cashFlowData={cashFlowData}
              accounts={allAccounts}
              isLoading={isLoading}
              onAddTransaction={() => onNavigate('log')}
              onSeeTrends={() => onSeeTrends('categories')}
            />
          </div>
        </div>
      </section>

    </div>
  )
}