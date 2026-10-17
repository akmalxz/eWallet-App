// src/pages/AnalyticsPage.jsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import { BarChart3, PlusCircle, AlertCircle } from 'lucide-react'
import { useAnalyticsData } from '../hooks/useAnalyticsData'
import { AccountSelect, EmptyState } from '../components/analytics/AnalyticsShared'
import { HeadlineInsights } from '../components/analytics/HeadlineInsights'
import { MainTrendChart } from '../components/analytics/MainTrendChart'
import { PatternViews } from '../components/analytics/PatternViews'
import { CategoryMovement } from '../components/analytics/CategoryMovement'
import { IncomeVsExpense } from '../components/analytics/IncomeVsExpense'
import { toMYDate } from '../utils/dateHelpers'
import { AccountSelector } from '../components/shared/AccountSelector'
import { SlidingSegmentedControl } from '../components/shared/SlidingSegmentedControl'

// ============================================================
// ITEM DEFINITIONS
// ============================================================
const PERIOD_ITEMS = [
  { id: 3, label: '3M' },
  { id: 6, label: '6M' },
  { id: 12, label: '12M' }
]

const TAB_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'trends', label: 'Trends' },
  { id: 'categories', label: 'Categories' },
  { id: 'income', label: 'Income' }
]

const MODE_ITEMS = [
  { id: 'all',      label: 'All' },
  { id: 'everyday', label: 'Excl. bills' }
]

// ============================================================
// HELPERS
// ============================================================
const getInitialParam = (key, validValues, fallback) => {
  if (typeof window === 'undefined') return fallback
  const v = new URLSearchParams(window.location.search).get(key)
  return validValues.includes(v) ? v : fallback
}

// ============================================================
// LOADING SKELETON — mimics the Overview tab layout
// ============================================================
const AnalyticsSkeleton = () => (
  <div className="space-y-4">

    {/* Two insight rows */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="bg-surface/60 border border-line/50 rounded-2xl p-4 flex items-start gap-3 animate-pulse"
        >
          <div className="w-9 h-9 rounded-xl bg-surface-3 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-full bg-surface-2 rounded-full" />
            <div className="h-3 w-3/4 bg-surface-2 rounded-full" />
          </div>
        </div>
      ))}
    </div>

    {/* Trend chart block */}
    <div className="bg-surface/60 border border-line/50 rounded-3xl p-5 md:p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-surface-3 rounded-full animate-pulse" />
          <div className="h-2.5 w-48 bg-surface-2 rounded-full animate-pulse" />
        </div>
        <div className="h-11 w-52 bg-surface-2 rounded-2xl animate-pulse" />
      </div>
      <div className="h-[280px] bg-surface-2 rounded-2xl animate-pulse" />
    </div>

  </div>
)

// ============================================================
// PAGE
// ============================================================
export function AnalyticsPage({
  user,
  profile,
  accounts = [],
  categories = [],
  onBack,
  onLogTransaction,
  showToast
}) {
  const [period, setPeriod] = useState(() => {
    const p = getInitialParam('ap', ['3', '6', '12'], '6')
    return parseInt(p)
  })
  const [tab, setTab] = useState(() =>
    getInitialParam('at', TAB_ITEMS.map(t => t.id), 'overview')
  )
  const [selectedAccount, setSelectedAccount] = useState('all')
  const [mode, setMode] = useState(() =>
    getInitialParam('am', MODE_ITEMS.map(m => m.id), 'all')
  )

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('ap', String(period))
    url.searchParams.set('at', tab)
    url.searchParams.set('am', mode)
    window.history.replaceState({}, '', url.toString())
  }, [period, tab, mode])

  const {
    expenses,
    everydayExpenses,
    income,
    loading,
    error
  } = useAnalyticsData(user, showToast)

  // Account filter
  const filteredExpenses = useMemo(() => {
    if (selectedAccount === 'all') return expenses
    return expenses.filter(tx => tx.source_account_id === selectedAccount)
  }, [expenses, selectedAccount])

  const filteredEverydayExpenses = useMemo(() => {
    if (selectedAccount === 'all') return everydayExpenses
    return everydayExpenses.filter(tx => tx.source_account_id === selectedAccount)
  }, [everydayExpenses, selectedAccount])

  const filteredIncome = useMemo(() => {
    if (selectedAccount === 'all') return income
    return income.filter(tx => tx.destination_account_id === selectedAccount)
  }, [income, selectedAccount])

  // Spending source — mode-aware
  const spendingSource =
    mode === 'everyday' ? filteredEverydayExpenses : filteredExpenses

  const periodScopedExpenses = useMemo(() => {
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - period)
    cutoff.setDate(1)
    cutoff.setHours(0, 0, 0, 0)
    return spendingSource.filter(tx => toMYDate(tx.transaction_date) >= cutoff)
  }, [spendingSource, period])

  // Full set — always includes bills (used by Income tab only)
  const periodScopedExpensesAll = useMemo(() => {
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - period)
    cutoff.setDate(1)
    cutoff.setHours(0, 0, 0, 0)
    return filteredExpenses.filter(tx => toMYDate(tx.transaction_date) >= cutoff)
  }, [filteredExpenses, period])

  const periodScopedIncome = useMemo(() => {
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - period)
    cutoff.setDate(1)
    cutoff.setHours(0, 0, 0, 0)
    return filteredIncome.filter(tx => toMYDate(tx.transaction_date) >= cutoff)
  }, [filteredIncome, period])

  const handleTabNavigate = useCallback((newTab) => setTab(newTab), [])

  const activeAccountName =
    selectedAccount === 'all'
      ? 'All accounts'
      : accounts.find(a => a.id === selectedAccount)?.account_name || 'Account'

  const showModeControl = tab !== 'income'

  // ────────────────────────────────────────────────────────────
  // State classification
  // ────────────────────────────────────────────────────────────
  // Truly empty: not loading, no error, no data anywhere. Renders
  // a full-page empty state instead of the filters + tabs.
  const isTrulyEmpty =
    !loading &&
    !error &&
    (expenses?.length || 0) === 0 &&
    (income?.length || 0) === 0

  const showFilters = !isTrulyEmpty && !error

  const handleLogTransaction = useCallback(() => {
    if (onLogTransaction) onLogTransaction()
    else if (onBack) onBack()
  }, [onLogTransaction, onBack])

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto animate-enter pb-12 space-y-4">

      {/* Desktop title row — filters hidden during error / empty */}
      <div className="hidden md:flex md:items-center md:justify-between md:gap-4 px-1">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-fg tracking-tight">Analytics</h1>
          <p className="text-sm text-fg-muted mt-1">Deep dive into your financial trends.</p>
        </div>
        {showFilters && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-56">
              <SlidingSegmentedControl
                items={PERIOD_ITEMS}
                value={period}
                onChange={setPeriod}
              />
            </div>
            {showModeControl && (
              <div className="w-56">
                <SlidingSegmentedControl
                  items={MODE_ITEMS}
                  value={mode}
                  onChange={setMode}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─────────── ERROR STATE ─────────── */}
      {error && (
        <div className="bg-danger-soft border border-danger-border rounded-3xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-danger mx-auto mb-4" />
          <p className="text-sm font-bold text-danger-text">Couldn't load analytics</p>
          <p className="text-xs text-danger-text/80 mt-1 max-w-sm mx-auto leading-relaxed">
            {error}
          </p>
          <button
            onClick={onBack}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-danger-solid hover:bg-danger-solid-hover text-white text-xs font-bold rounded-xl transition-colors"
            style={{ minHeight: 40 }}
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {/* ─────────── PAGE-LEVEL EMPTY STATE ─────────── */}
      {!error && isTrulyEmpty && (
        <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl shadow-sm">
          <EmptyState
            icon={BarChart3}
            title="No data to analyze yet"
            message="Log a few transactions and come back — trends, categories, and income insights will appear here."
            action={{
              label: 'Log a transaction',
              icon: PlusCircle,
              onClick: handleLogTransaction,
            }}
          />
        </div>
      )}

      {/* ─────────── NORMAL PAGE ─────────── */}
      {!error && !isTrulyEmpty && (
        <>
          {/* Tabs row */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <SlidingSegmentedControl
                items={TAB_ITEMS}
                value={tab}
                onChange={setTab}
              />
            </div>
            <div className="hidden md:block w-56 shrink-0">
              <AccountSelect
                accounts={accounts}
                value={selectedAccount}
                onChange={setSelectedAccount}
              />
            </div>
          </div>

          {/* Mobile filters */}
          <div className="md:hidden space-y-3">
            {showModeControl ? (
              <div className="grid grid-cols-2 gap-2">
                <SlidingSegmentedControl
                  items={PERIOD_ITEMS}
                  value={period}
                  onChange={setPeriod}
                />
                <SlidingSegmentedControl
                  items={MODE_ITEMS}
                  value={mode}
                  onChange={setMode}
                />
              </div>
            ) : (
              <SlidingSegmentedControl
                items={PERIOD_ITEMS}
                value={period}
                onChange={setPeriod}
              />
            )}

            <AccountSelector
              accounts={accounts}
              value={selectedAccount}
              onChange={setSelectedAccount}
            />
          </div>

          {/* Tab content or loading skeleton */}
          {loading ? (
            <AnalyticsSkeleton />
          ) : (
            <>
              {tab === 'overview' && (
                <>
                  <HeadlineInsights
                    expenses={periodScopedExpenses}
                    periodMonths={period}
                    onNavigate={handleTabNavigate}
                  />
                  <MainTrendChart
                    expenses={periodScopedExpenses}
                    periodMonths={period}
                    accounts={accounts}
                  />
                </>
              )}

              {tab === 'trends' && (
                <PatternViews expenses={periodScopedExpenses} accounts={accounts} />
              )}

              {tab === 'categories' && (
                <CategoryMovement expenses={periodScopedExpenses} periodMonths={period} />
              )}

              {tab === 'income' && (
                <IncomeVsExpense
                  income={periodScopedIncome}
                  expenses={periodScopedExpensesAll}
                  periodMonths={period}
                  accounts={accounts}
                  selectedAccountId={selectedAccount}
                  accountLabel={activeAccountName}
                  onAddIncome={onBack}
                />
              )}
            </>
          )}
        </>
      )}

    </div>
  )
}