// src/App.jsx
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import {
  Wallet, Landmark, Activity, PiggyBank, Database,
  AlertTriangle, CheckCircle, Users, Receipt
} from 'lucide-react'

// Components
import Auth from './components/Auth'
import { ToastNotification } from './components/shared/Toast'
import { LoadingSpinner } from './components/shared/LoadingSpinner'
import { AccountChipRow } from './components/shared/AccountChipRow'
import { AccountSelector } from './components/shared/AccountSelector'
import { Header } from './components/layouts/Header'
import { NavigationBar } from './components/layouts/NavigationBar'
import { AccountCards } from './components/dashboard/AccountCards'
import { BurnRateWidget } from './components/dashboard/BurnRateWidget'
import { CashFlowHeatmap } from './components/dashboard/CashFlowHeatmap'
import { BurnRateHelpSheet } from './components/dashboard/BurnRateHelpSheet'

// Pages
import { LogItemPage } from './pages/LogItemPage'
import { ProfilePage } from './pages/ProfilePage'
import { TransactionsPage } from './pages/TransactionsPage'
import { CommitmentsPage } from './pages/CommitmentsPage'
import { NetworkPage } from './pages/NetworkPage'
import { SplitBillPage } from './pages/SplitBillPage'
import { AnalyticsPage } from './pages/AnalyticsPage'

// Hooks
import { useAuth } from './hooks/useAuth'
import { useTransactions } from './hooks/useTransactions'
import { useCommitments } from './hooks/useCommitments'

// Utils
import { TransactionParser } from './utils/nlpParser'
import { getDayOfMonthMY, monthKey, toMYDate } from './utils/dateHelpers'
import { rollUpToMain, getCategoryColor, OTHER_COLOR } from './utils/analytics/categoryColors'
import { computeBurnRate } from './utils/analytics/burnRateEngine'
import { computeCommitmentSchedule } from './utils/commitments/commitmentSchedule'

const ICON_MAP = { Landmark, Wallet, Activity, PiggyBank, Database }

export default function App() {
  const { user, profile, refreshProfile, isAuthenticated, isAuthLoading } = useAuth()

  const [toasts, setToasts] = useState([])
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
  }, [])

  const {
    accounts, recentTransactions, setRecentTransactions,
    commitments, setCommitments,
    commitmentPayments, setCommitmentPayments,
    monthlyExpenses,
    categories, classifications, isLoading, error, fetchAllData
  } = useTransactions(user, showToast)

  // P4.1 — one hook owns saving state + mutations + toasts
  const commitmentsApi = useCommitments({
    user,
    commitments,
    fetchAllData,
    showToast
  })

  const [currentView, setCurrentView] = useState('dashboard')
  const [requestedModal, setRequestedModal] = useState(null)

  useEffect(() => {
    if (currentView !== 'profile') {
      setRequestedModal(null)
    }
  }, [currentView])

  const [omnibarText, setOmnibarText] = useState('')
  const [omnibarStatus, setOmnibarStatus] = useState({ type: '', message: '' })
  const [isRefreshingLedger, setIsRefreshingLedger] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)

  const statusTimeoutRef = useRef(null)
  const hasFetchedRef = useRef(false)
  const autoRefreshIntervalRef = useRef(null)

  useEffect(() => {
    if (isAuthenticated && user && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchAllData()
    }
  }, [isAuthenticated, user, fetchAllData])

  const handleRefreshLedger = useCallback(
    async (showToastMessage = true) => {
      if (isRefreshingLedger || !user) return
      setIsRefreshingLedger(true)
      try {
        const [txResult, commResult, payResult] = await Promise.all([
          supabase
            .from('transactions')
            .select('*')
            .order('needs_review', { ascending: false })
            .order('transaction_date', { ascending: false })
            .limit(30),
          supabase.from('commitments').select('*'),
          supabase
            .from('commitments_payments')
            .select('id, commitment_id, period_year, period_month, status, transaction_id, created_at')
            .gte('period_year', new Date().getFullYear() - 1)
        ])
        if (txResult.error) throw txResult.error
        if (commResult.error) throw commResult.error
        if (payResult.error) throw payResult.error
        setRecentTransactions(txResult.data || [])
        setCommitments(commResult.data || [])
        setCommitmentPayments(payResult.data || [])
        if (showToastMessage) showToast('Ledger refreshed successfully!', 'success')
      } catch (err) {
        if (showToastMessage) showToast('Failed to refresh ledger: ' + err.message, 'error')
      } finally {
        setIsRefreshingLedger(false)
      }
    },
    [user, isRefreshingLedger, showToast, setRecentTransactions, setCommitments, setCommitmentPayments]
  )

  useEffect(() => {
    if (!user) return
    if (autoRefreshIntervalRef.current) clearInterval(autoRefreshIntervalRef.current)
    autoRefreshIntervalRef.current = setInterval(() => handleRefreshLedger(false), 60000)
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
        autoRefreshIntervalRef.current = null
      }
    }
  }, [user, handleRefreshLedger])

  // ============================================
  // ACCOUNT ROUTING
  // ============================================
  const handleAddAccount = () => {
    setRequestedModal('banks')
    setCurrentView('profile')
  }
  const handleLogTransactionFromAccount = (account) => {
    setSelectedAccount(account)
    setCurrentView('log')
  }
  const handleManageAccount = (account) => {
    setSelectedAccount(account)
    setRequestedModal('banks')
    setCurrentView('profile')
  }

  const activeAccounts = useMemo(() => accounts.filter((a) => !a.is_archived), [accounts])

  const sortedAccounts = useMemo(() => {
    return [...activeAccounts].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      const aOrder = a.sort_order ?? 0
      const bOrder = b.sort_order ?? 0
      return aOrder - bOrder
    })
  }, [activeAccounts])

  // ============================================
  // PIN
  // ============================================
  const handleTogglePin = async (account) => {
    try {
      if (!account.is_pinned) {
        const otherPinned = accounts.find((a) => a.id !== account.id && a.is_pinned)
        if (otherPinned) {
          showToast(
            `Only one account can be pinned. Unpin "${otherPinned.account_name}" first.`,
            'warning'
          )
          return
        }
      }

      const { data, error } = await supabase
        .from('accounts')
        .update({ is_pinned: !account.is_pinned })
        .eq('id', account.id)
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Pin failed — no rows affected. Check RLS on accounts.')
      }

      showToast(account.is_pinned ? 'Account unpinned' : 'Account pinned to top', 'success')
      fetchAllData()
    } catch (err) {
      showToast('Error toggling pin: ' + err.message, 'error')
    }
  }

  // ============================================
  // MOVE ACCOUNT
  // ============================================
  const handleMoveAccount = async (accountId, direction) => {
    if (!user) return

    const list = sortedAccounts
    const idx = list.findIndex((a) => a.id === accountId)
    if (idx === -1) return

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= list.length) return

    const current = list[idx]
    const target = list[targetIdx]
    if (!!current.is_pinned !== !!target.is_pinned) return

    const newList = [...list]
    newList[idx] = target
    newList[targetIdx] = current

    try {
      const results = await Promise.all(
        newList.map((a, i) =>
          supabase.from('accounts').update({ sort_order: i }).eq('id', a.id).select()
        )
      )
      const failed = results.find((r) => r.error || !r.data || r.data.length === 0)
      if (failed) throw new Error('Reorder failed — no rows updated. Check RLS on accounts.')
      fetchAllData()
    } catch (err) {
      showToast('Error reordering: ' + err.message, 'error')
    }
  }

  // ============================================
  // COMPUTED
  // ============================================
  const dynamicAccountDict = useMemo(() => {
    const dict = {}
    accounts.forEach((acc) => {
      const name = acc.account_name.toLowerCase()
      dict[name] = acc.id
      if (acc.classification === 'ewallet' && name.includes('tng')) dict['tng'] = acc.id
      if (acc.classification === 'digital_bank' && name.includes('gx')) dict['gx'] = acc.id
      if (acc.classification === 'hub' && name.includes('maybank')) dict['mbb'] = acc.id
      dict[acc.classification] = acc.id
    })
    return dict
  }, [accounts])

  const parser = useMemo(
    () => new TransactionParser(dynamicAccountDict, categories),
    [dynamicAccountDict, categories]
  )

  const mainCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories])
  const getSubCategories = useCallback(
    (parentId) => categories.filter((c) => c.parent_id === parentId),
    [categories]
  )

  // ============================================
  // OMNIBAR
  // ============================================
  const handleOmnibarSubmit = async (e) => {
    e.preventDefault()
    if (!omnibarText.trim() || !user) return
    setOmnibarStatus({ type: 'loading', message: 'Processing...' })
    try {
      const parsed = parser.parse(omnibarText)
      if (parsed.amount <= 0) throw new Error('Amount must be greater than 0')
      const payload = {
        user_id: user.id,
        description: parsed.description,
        amount: Math.abs(parsed.amount),
        source_account_id: parsed.sourceAccountId,
        destination_account_id: parsed.destinationAccountId,
        category: parsed.category,
        needs_review: parsed.needsReview || false
      }
      const { error } = await supabase.from('transactions').insert([payload])
      if (error) throw error
      setOmnibarStatus({ type: 'success', message: `Logged: ${parsed.description}` })
      showToast(`Transaction logged: ${parsed.description}`, 'success')
      setOmnibarText('')
      fetchAllData()
    } catch (err) {
      setOmnibarStatus({ type: 'error', message: err.message })
      showToast(err.message, 'error')
    }
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    statusTimeoutRef.current = setTimeout(
      () => setOmnibarStatus({ type: '', message: '' }),
      4000
    )
  }

  const handleApproveTransaction = async (id, updatedCategory, updatedDate = null) => {
    if (!updatedCategory || updatedCategory === 'uncategorized') {
      return showToast('Please select a category before approving', 'warning')
    }
    try {
      const updatePayload = { needs_review: false, category: updatedCategory }
      if (updatedDate) {
        updatePayload.transaction_date = new Date(`${updatedDate}T12:00:00`).toISOString()
      }
      const { error } = await supabase.from('transactions').update(updatePayload).eq('id', id)
      if (error) throw error
      showToast('Transaction approved successfully!', 'success')
      fetchAllData()
    } catch (err) {
      showToast('Error approving transaction: ' + err.message, 'error')
    }
  }

  const handleDeleteTransaction = async (id) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      showToast('Transaction deleted successfully', 'success')
      fetchAllData()
    } catch (err) {
      showToast('Error deleting transaction: ' + err.message, 'error')
    }
  }

  const handleEditTransaction = async (id, updatedData) => {
    try {
      if (updatedData.amount <= 0) return showToast('Amount must be greater than 0', 'error')
      if (!updatedData.description || updatedData.description.trim().length < 2) {
        return showToast('Description must be at least 2 characters', 'error')
      }
      if (!updatedData.category || updatedData.category === 'uncategorized') {
        return showToast('Please select a valid category', 'error')
      }
      const updatePayload = {
        description: updatedData.description.trim(),
        category: updatedData.category,
        amount: updatedData.amount,
        source_account_id: updatedData.source_account_id || null,
        destination_account_id: updatedData.destination_account_id || null,
        needs_review: false
      }
      if (updatedData.transaction_date) {
        updatePayload.transaction_date = new Date(`${updatedData.transaction_date}T12:00:00`).toISOString()
      }
      const { error } = await supabase.from('transactions').update(updatePayload).eq('id', id).select()
      if (error) throw error
      showToast('Transaction updated successfully!', 'success')
      await fetchAllData()
    } catch (err) {
      showToast(`Error updating transaction: ${err.message || 'Unknown error'}`, 'error')
    }
  }

  // ============================================
  // WIDGET ACCOUNT STATE
  // ============================================
  const [radarAccountId, setRadarAccountId] = useState('')
  const [homeAccountId, setHomeAccountId] = useState('all')
  const [showBurnRateHelp, setShowBurnRateHelp] = useState(false)

  const activeRadarId = radarAccountId || accounts[0]?.id

  // ============================================
  // RADAR
  // ============================================
  const radarCommitments = commitments

  const radarSchedule = useMemo(() => {
    return computeCommitmentSchedule({
      commitments,
      payments: commitmentPayments,
      accounts,
      scopeAccountId: 'all',
      now: new Date()
    })
  }, [commitments, commitmentPayments, accounts])

  const radarStats = useMemo(() => {
    const currentBalance = accounts
      .filter((a) => !a.is_archived)
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0)

    const totalRequired = radarSchedule.total
    const isSafe = currentBalance >= totalRequired

    return {
      currentBalance,
      totalRequired,
      unpaidCount: radarSchedule.unpaidPeriods.length,
      isSafe,
      shortfall: Math.max(0, totalRequired - currentBalance)
    }
  }, [accounts, radarSchedule])

  // ============================================
  // BURN RATE ENGINE
  // ============================================
  const velocityStats = useMemo(() => {
    return computeBurnRate({
      accounts,
      expenses: monthlyExpenses || [],
      commitments,
      payments: commitmentPayments,
      scopeAccountId: homeAccountId,
      now: new Date()
    })
  }, [accounts, monthlyExpenses, commitments, commitmentPayments, homeAccountId])

  // ============================================
  // CASH FLOW ENGINE
  // ============================================
  const cashFlowData = useMemo(() => {
    const now = new Date()
    const dayOfMonth = getDayOfMonthMY(now)

    const isAll = homeAccountId === 'all'
    const scopedAccounts = isAll ? accounts : accounts.filter((a) => a.id === homeAccountId)
    const accountIds = new Set(scopedAccounts.map((a) => a.id))

    const thisKey = monthKey(now)
    const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastKey = monthKey(lastDate)

    const thisByCat = {}
    const lastByCat = {}

    ;(monthlyExpenses || []).forEach((tx) => {
      if (!accountIds.has(tx.source_account_id)) return
      if (tx.needs_review) return
      const amt = Number(tx.amount) || 0
      if (amt <= 0) return
      const k = monthKey(tx.transaction_date)
      const cat = rollUpToMain(tx.category)
      if (k === thisKey) {
        thisByCat[cat] = (thisByCat[cat] || 0) + amt
      } else if (k === lastKey) {
        const d = toMYDate(tx.transaction_date)
        if (d.getUTCDate() <= dayOfMonth) {
          lastByCat[cat] = (lastByCat[cat] || 0) + amt
        }
      }
    })

    const grandTotal = Object.values(thisByCat).reduce((s, v) => s + v, 0)
    if (grandTotal === 0) return []

    const rows = Object.entries(thisByCat)
      .map(([name, value]) => {
        const last = lastByCat[name] || 0
        let comparison = null
        if (last > 0) {
          const diff = value - last
          comparison = { diff, pct: (diff / last) * 100, isNew: false }
        } else if (last === 0 && value > 0) {
          comparison = { diff: value, pct: null, isNew: true }
        }
        return { name, value, comparison }
      })
      .sort((a, b) => b.value - a.value)

    const top5 = rows.slice(0, 5).filter((r) => (r.value / grandTotal) * 100 >= 3)
    const rest = rows.filter((r) => !top5.includes(r))

    if (rest.length > 0) {
      const otherTotal = rest.reduce((s, r) => s + r.value, 0)
      const otherLast = rest.reduce((s, r) => s + (lastByCat[r.name] || 0), 0)
      let comparison = null
      if (otherLast > 0) {
        const diff = otherTotal - otherLast
        comparison = { diff, pct: (diff / otherLast) * 100, isNew: false }
      }
      top5.push({ name: 'Other', value: otherTotal, comparison, isOther: true })
    }

    return top5.map((r) => ({
      ...r,
      color: r.isOther ? OTHER_COLOR : getCategoryColor(r.name)
    }))
  }, [accounts, monthlyExpenses, homeAccountId])

  // ============================================
  // SEE TRENDS
  // ============================================
  const handleSeeTrends = useCallback((tab) => {
    const url = new URL(window.location.href)
    url.searchParams.set('at', tab || 'overview')
    window.history.replaceState({}, '', url.toString())
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setCurrentView('analytics')
  }, [])

  // ============================================
  // RENDER
  // ============================================
  if (isAuthLoading) return <LoadingSpinner message="Loading secure vault..." />
  if (!isAuthenticated) return <Auth />
    if (error)
    return (
      <div className="min-h-dvh bg-page flex items-center justify-center p-4 px-safe py-safe">
        <div className="bg-surface rounded-2xl shadow-sm border border-danger-border p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-bold text-fg mb-2">Connection Error</h2>
          <p className="text-sm text-fg-muted mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-brand-solid hover:bg-brand-solid-hover text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )

    return (
    <div className="app-shell min-h-dvh bg-gradient-to-b from-page to-surface-2 font-sans text-fg">
      <div
        className="fixed right-4 z-50 space-y-2 max-w-[calc(100vw-2rem)]"
        style={{
          top: 'calc(1rem + env(safe-area-inset-top, 0px))',
          right: 'max(1rem, env(safe-area-inset-right, 0px))'
        }}
      >
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          />
        ))}
      </div>

      <Header
        user={user}
        profile={profile}
        currentView={currentView}
        setCurrentView={setCurrentView}
        supabase={supabase}
      />

      <NavigationBar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {currentView === 'dashboard' && (
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
                  accounts={sortedAccounts}
                  classifications={classifications}
                  onAddAccount={handleAddAccount}
                  onLogTransaction={handleLogTransactionFromAccount}
                  onManageAccount={handleManageAccount}
                  onTogglePin={handleTogglePin}
                  onMoveAccount={handleMoveAccount}
                />
              )}
            </section>

            <section className="grid grid-cols-3 gap-3 md:gap-4">
              <button
                onClick={() => setCurrentView('network')}
                className="bg-surface/60 backdrop-blur-xl border border-line/50 p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-surface/80 transition-all group"
              >
                <div className="w-10 h-10 bg-surface-2 text-fg rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-fg-muted">Network</span>
              </button>

              <button
                onClick={() => setCurrentView('split')}
                className="bg-surface/60 backdrop-blur-xl border border-line/50 p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-surface/80 transition-all group"
              >
                <div className="w-10 h-10 bg-surface-2 text-fg rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Receipt className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-fg-muted">Split Bill</span>
              </button>

              <button
                onClick={() => setCurrentView('analytics')}
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
                    onChange={setHomeAccountId}
                  />
                </div>

                <div className="md:hidden">
                  <AccountSelector
                    accounts={activeAccounts}
                    value={homeAccountId}
                    onChange={setHomeAccountId}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-line">
                <div className="p-4 md:p-5">
                  <BurnRateWidget
                    velocityStats={velocityStats}
                    onSeeTrends={() => handleSeeTrends('overview')}
                    onOpenHelp={() => setShowBurnRateHelp(true)}
                  />
                </div>
                <div className="p-4 md:p-5">
                  <CashFlowHeatmap
                    cashFlowData={cashFlowData}
                    accounts={accounts}
                    onAddTransaction={() => setCurrentView('log')}
                    onSeeTrends={() => handleSeeTrends('categories')}
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {currentView === 'log' && (
          <LogItemPage
            user={user}
            accounts={activeAccounts}
            mainCategories={mainCategories}
            getSubCategories={getSubCategories}
            fetchAllData={fetchAllData}
            showToast={showToast}
          />
        )}

        {currentView === 'transactions' && (
          <TransactionsPage
            user={user}
            accounts={accounts}
            mainCategories={mainCategories}
            getSubCategories={getSubCategories}
            fetchAllData={fetchAllData}
            showToast={showToast}
            recentTransactions={recentTransactions}
            handleApproveTransaction={handleApproveTransaction}
            handleDeleteTransaction={handleDeleteTransaction}
            handleEditTransaction={handleEditTransaction}
            onRefresh={() => handleRefreshLedger(true)}
            isRefreshing={isRefreshingLedger}
            onAddTransaction={() => setCurrentView('log')}
          />
        )}

        {currentView === 'commitments' && (
          <CommitmentsPage
            radarStats={radarStats}
            radarSchedule={radarSchedule}
            radarCommitments={radarCommitments}
            payments={commitmentPayments}
            accounts={accounts}
            saving={commitmentsApi.saving}
            isLoading={isLoading}
            error={error}
            onBack={() => setCurrentView('dashboard')}
            onAddCommitment={commitmentsApi.addCommitment}
            onUpdateCommitment={commitmentsApi.updateCommitment}
            onDeleteCommitment={commitmentsApi.deleteCommitment}
            onPauseCommitment={commitmentsApi.pauseCommitment}
            onReactivateCommitment={commitmentsApi.reactivateCommitment}
            onMarkAsPaid={commitmentsApi.markPaid}
            onSkipCommitment={commitmentsApi.skip}
            onUnmarkAsPaid={commitmentsApi.undo}
          />
        )}

        {currentView === 'network' && (
          <NetworkPage
            user={user}
            profile={profile}
            showToast={showToast}
            onGoToProfile={() => setCurrentView('profile')}
            onGoToSplitBill={() => setCurrentView('split')}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'split' && (
          <SplitBillPage
            user={user}
            profile={profile}
            showToast={showToast}
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'profile' && (
          <ProfilePage
            user={user}
            profile={profile}
            refreshProfile={refreshProfile}
            accounts={accounts}
            activeAccounts={activeAccounts}
            categories={categories}
            getSubCategories={getSubCategories}
            classifications={classifications}
            commitments={commitments}
            fetchAllData={fetchAllData}
            showToast={showToast}
            selectedAccount={selectedAccount}
            initialModal={requestedModal}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'analytics' && (
          <AnalyticsPage
            user={user}
            profile={profile}
            accounts={activeAccounts}
            categories={categories}
            onBack={() => setCurrentView('dashboard')}
            showToast={showToast}
          />
        )}
      </main>

      {showBurnRateHelp && (
        <BurnRateHelpSheet onClose={() => setShowBurnRateHelp(false)} />
      )}
    </div>
  )
}