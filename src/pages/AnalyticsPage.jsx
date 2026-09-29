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

// ============================================================
// SLIDING SEGMENTED CONTROL — liquid glass, matches bottom nav
// ============================================================
const SlidingSegmentedControl = ({ items, value, onChange }) => {
  const activeIndex = items.findIndex(item => item.id === value)

  return (
    <div className="relative w-full h-11 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="relative flex items-center h-full">

        {/* Sliding black pill */}
        {activeIndex >= 0 && (
          <div
            className="absolute inset-y-0 left-0 pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              width: `${100 / items.length}%`,
              transform: `translateX(${activeIndex * 100}%)`
            }}
          >
            <div className="absolute inset-1 rounded-xl bg-gradient-to-b from-slate-900 to-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]" />
          </div>
        )}

        {/* Items */}
        {items.map(item => {
          const isActive = item.id === value
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`relative z-10 flex-1 h-full min-w-0 flex items-center justify-center px-2 transition-colors duration-300 text-xs font-bold ${
                isActive
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}

      </div>
    </div>
  )
}

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

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('ap', String(period))
    url.searchParams.set('at', tab)
    window.history.replaceState({}, '', url.toString())
  }, [period, tab])

  // ----------------------------------------------------------
  // Data
  // ----------------------------------------------------------
  const { expenses, income, loading, error } = useAnalyticsData(user, showToast)

  const filteredExpenses = useMemo(() => {
    if (selectedAccount === 'all') return expenses
    return expenses.filter(tx => tx.source_account_id === selectedAccount)
  }, [expenses, selectedAccount])

  const filteredIncome = useMemo(() => {
    if (selectedAccount === 'all') return income
    return income.filter(tx => tx.destination_account_id === selectedAccount)
  }, [income, selectedAccount])

  const periodScopedExpenses = useMemo(() => {
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
        className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors px-1"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* ======================================================
          Desktop title row — Title on left, Period on right.
          Hidden entirely on mobile.
      ====================================================== */}
      <div className="hidden md:flex md:items-center md:justify-between md:gap-4 px-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Deep dive into your financial trends.</p>
        </div>
        <div className="w-56 shrink-0">
          <SlidingSegmentedControl
            items={PERIOD_ITEMS}
            value={period}
            onChange={setPeriod}
          />
        </div>
      </div>

      {/* ======================================================
          Tabs row — sliding glass pill, matches bottom nav
      ====================================================== */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <SlidingSegmentedControl
            items={TAB_ITEMS}
            value={tab}
            onChange={setTab}
          />
        </div>

        {/* Account filter — desktop only, sits beside tabs */}
        {tab !== 'income' && (
          <div className="hidden md:block w-56 shrink-0">
            <AccountSelect
              accounts={accounts}
              value={selectedAccount}
              onChange={setSelectedAccount}
            />
          </div>
        )}
      </div>

      {/* ======================================================
          Mobile-only filters block
          Period + Account stacked, both full-width
      ====================================================== */}
      <div className="md:hidden space-y-3">
        <SlidingSegmentedControl
          items={PERIOD_ITEMS}
          value={period}
          onChange={setPeriod}
        />

        {tab !== 'income' && (
          <AccountSelect
            accounts={accounts}
            value={selectedAccount}
            onChange={setSelectedAccount}
          />
        )}
      </div>

      {/* ======================================================
          Tab content
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
          expenses={periodScopedExpenses}
          periodMonths={period}
          onAddIncome={onBack}
        />
      )}

      {/* Loading / error */}
      {loading && periodScopedExpenses.length === 0 && (
        <p className="text-center text-xs text-slate-400 py-6">Loading analytics…</p>
      )}
      {error && (
        <p className="text-center text-xs text-red-500 py-6">Failed to load: {error}</p>
      )}

    </div>
  )
}