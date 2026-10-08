// src/pages/AnalyticsPage.jsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useAnalyticsData } from '../hooks/useAnalyticsData'
import { AccountSelect } from '../components/analytics/AnalyticsShared'
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

// Mode filter — controls whether commitment payments are included
// in spending analytics. Not applied to the Income tab, which always
// uses the full expense set so the savings rate stays honest.
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
// PAGE
// ============================================================
export function AnalyticsPage({
  user,
  profile,
  accounts = [],
  categories = [],
  onBack,
  showToast
}) {
  // ----------------------------------------------------------
  // URL-synced page state
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // Data
  // ----------------------------------------------------------
  const {
    expenses,
    everydayExpenses,
    income,
    loading,
    error
  } = useAnalyticsData(user, showToast)

  // ----------------------------------------------------------
  // Filter by account first (mode-agnostic)
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // Pick which expense set the spending views should use.
  // Mode is ignored on the Income tab — IncomeVsExpense always
  // reads `periodScopedExpensesAll` so the savings rate stays true.
  // ----------------------------------------------------------
  const spendingSource =
    mode === 'everyday' ? filteredEverydayExpenses : filteredExpenses

  const periodScopedExpenses = useMemo(() => {
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - period)
    cutoff.setDate(1)
    cutoff.setHours(0, 0, 0, 0)
    return spendingSource.filter(tx => toMYDate(tx.transaction_date) >= cutoff)
  }, [spendingSource, period])

  // Full expense set — always includes commitments, regardless of mode.
  // Only IncomeVsExpense reads this.
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

  // Mode is meaningless on the Income tab — savings rate needs bills
  // included or it lies. Hide the control there rather than disabling it.
  const showModeControl = tab !== 'income'

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 space-y-4">

      {/* ======================================================
          Back button
      ====================================================== */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-bold text-fg-muted hover:text-fg transition-colors px-1"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* ======================================================
          Desktop title row — title on left, period + mode on right
      ====================================================== */}
      <div className="hidden md:flex md:items-center md:justify-between md:gap-4 px-1">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-fg tracking-tight">Analytics</h1>
          <p className="text-sm text-fg-muted mt-1">Deep dive into your financial trends.</p>
        </div>
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
      </div>

      {/* ======================================================
          Tabs row
      ====================================================== */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <SlidingSegmentedControl
            items={TAB_ITEMS}
            value={tab}
            onChange={setTab}
          />
        </div>

        {/* Account filter — desktop only */}
        <div className="hidden md:block w-56 shrink-0">
          <AccountSelect
            accounts={accounts}
            value={selectedAccount}
            onChange={setSelectedAccount}
          />
        </div>
      </div>

      {/* ======================================================
          Mobile-only filters block.
          Period + Mode share a row when Mode is visible; period
          spans the full width on the Income tab.
      ====================================================== */}
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

      {/* ======================================================
          Tab content.
          Spending tabs read `periodScopedExpenses` (mode-aware).
          Income reads `periodScopedExpensesAll` (mode-ignored).
      ====================================================== */}

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

      {/* Loading / error */}
      {loading && periodScopedExpenses.length === 0 && (
        <p className="text-center text-xs text-fg-subtle py-6">Loading analytics…</p>
      )}
      {error && (
        <p className="text-center text-xs text-danger py-6">Failed to load: {error}</p>
      )}

    </div>
  )
}