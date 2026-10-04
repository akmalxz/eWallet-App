// src/pages/DashboardPage.jsx
import { Activity, Receipt, Users } from 'lucide-react'
import { AccountCards } from '../components/dashboard/AccountCards'
import { BurnRateWidget } from '../components/dashboard/BurnRateWidget'
import { CashFlowHeatmap } from '../components/dashboard/CashFlowHeatmap'
import { AccountChipRow } from '../components/shared/AccountChipRow'
import { AccountSelector } from '../components/shared/AccountSelector'

export function DashboardPage({
  isLoading,
  accounts,
  activeAccounts,
  allAccounts,
  classifications,
  homeAccountId,
  onHomeAccountChange,
  velocityStats,
  cashFlowData,
  onAddAccount,
  onLogTransaction,
  onManageAccount,
  onTogglePin,
  onMoveAccount,
  onSeeTrends,
  onOpenBurnRateHelp,
  onNavigate
}) {
  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          />
        )}
      </section>

      <section className="grid grid-cols-3 gap-3 md:gap-4">
        <button
          onClick={() => onNavigate('network')}
          className="bg-surface/60 backdrop-blur-xl border border-line/50 p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-surface/80 transition-all group"
        >
          <div className="w-10 h-10 bg-surface-2 text-fg rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-fg-muted">Network</span>
        </button>

        <button
          onClick={() => onNavigate('split')}
          className="bg-surface/60 backdrop-blur-xl border border-line/50 p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-surface/80 transition-all group"
        >
          <div className="w-10 h-10 bg-surface-2 text-fg rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-fg-muted">Split Bill</span>
        </button>

        <button
          onClick={() => onNavigate('analytics')}
          className="bg-surface/60 backdrop-blur-xl border border-line/50 p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-surface/80 transition-all group"
        >
          <div className="w-10 h-10 bg-surface-2 text-fg rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-fg-muted">Analytics</span>
        </button>
      </section>

      <section className="bg-surface/70 backdrop-blur-xl border border-line/60 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 md:px-5 md:pt-5 md:pb-4 border-b border-line">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-[11px] font-bold text-fg-subtle uppercase tracking-wider">
              This month
            </span>
          </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-line">
          <div className="p-4 md:p-5">
            <BurnRateWidget
              velocityStats={velocityStats}
              onSeeTrends={() => onSeeTrends('overview')}
              onOpenHelp={onOpenBurnRateHelp}
            />
          </div>
          <div className="p-4 md:p-5">
            <CashFlowHeatmap
              cashFlowData={cashFlowData}
              accounts={allAccounts}
              onAddTransaction={() => onNavigate('log')}
              onSeeTrends={() => onSeeTrends('categories')}
            />
          </div>
        </div>
      </section>
    </div>
  )
}