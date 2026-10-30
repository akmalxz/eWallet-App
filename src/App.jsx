// src/App.jsx
import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react'
import { AlertTriangle } from 'lucide-react'

import { supabase, sessionExpired } from './lib/supabaseClient'
import { trackEvent } from './lib/analytics'

import Auth from './components/Auth'
import ResetPassword from './components/ResetPassword'
import { ToastNotification } from './components/shared/Toast'
import { LoadingSpinner } from './components/shared/LoadingSpinner'
import { Header } from './components/layouts/Header'
import { NavigationBar } from './components/layouts/NavigationBar'
import { BurnRateHelpSheet } from './components/dashboard/BurnRateHelpSheet'
import { ReceivablesBanner } from './components/dashboard/ReceivablesBanner'

import { DashboardPage } from './pages/DashboardPage'
import { LogItemPage } from './pages/LogItemPage'
import { ProfilePage } from './pages/ProfilePage'
import { TransactionsPage } from './pages/TransactionsPage'
import { CommitmentsPage } from './pages/CommitmentsPage'
import { NetworkPage } from './pages/NetworkPage'
import { SplitBillPage } from './pages/SplitBillPage'

import { useAuth } from './hooks/useAuth'
import { useTransactions } from './hooks/useTransactions'
import { useCommitments } from './hooks/useCommitments'
import { useLedgerMutations } from './hooks/useLedgerMutations'
import { useDashboardMetrics } from './hooks/useDashboardMetrics'
import { useTransactionParser } from './hooks/useTransactionParser'
import { useAccountActions } from './hooks/useAccountActions'
import { useNotifications } from './hooks/useNotifications'
import { useErrorMonitor } from './hooks/useErrorMonitor'

import { CLASSIFICATIONS } from './utils/accounts/accountClassifications'

const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage }))
)

export default function App() {
  const { user, profile, refreshProfile, isAuthenticated, isAuthLoading } = useAuth()

  const [isRecovery, setIsRecovery] = useState(false)
  const [toasts, setToasts] = useState([])
  const [currentView, setCurrentView] = useState('dashboard')
  const [homeAccountId, setHomeAccountId] = useState('all')
  const [showBurnRateHelp, setShowBurnRateHelp] = useState(false)
  const [splitInitialTab, setSplitInitialTab] = useState('new')

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
      if (event === 'SIGNED_IN') trackEvent('signin_completed')
    })
    return () => subscription.unsubscribe()
  }, [])

  const {
    accounts, recentTransactions, setRecentTransactions,
    commitments, setCommitments,
    commitmentPayments, setCommitmentPayments,
    monthlyExpenses, pendingReceivables,
    categories, classifications, isLoading, error,
    fetchInitialData,
    fetchAccounts,
    fetchCategories,
    fetchRecentTransactions,
    fetchCommitments,
    fetchMonthlyData,
    fetchReceivables
  } = useTransactions(user, showToast)

  const commitmentsApi = useCommitments({ 
    user, 
    commitments, 
    fetchCommitments, 
    fetchRecentTransactions, 
    fetchAccounts, 
    fetchMonthlyData, 
    showToast 
  })

  const notifications = useNotifications(user)

  useErrorMonitor(user, useCallback((err) => {
    showToast(
      `Error: ${(err.message || 'Unknown').slice(0, 80)}`,
      'error'
    )
  }, [showToast]))

  useEffect(() => {
    if (!isAuthenticated) return
    if (sessionExpired.consume()) {
      showToast('Your session expired. Please sign in again.', 'warning')
    }
  }, [isAuthenticated, showToast])

  useEffect(() => {
    if (!isAuthenticated) return
    trackEvent('view_opened', { view: currentView })
  }, [currentView, isAuthenticated])

  useEffect(() => {
    if (currentView !== 'split') setSplitInitialTab('new')
  }, [currentView])

  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (isAuthenticated && user && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchInitialData()
    }
  }, [isAuthenticated, user, fetchInitialData])

  const pendingReceivablesThisMonth = (pendingReceivables || [])
    .filter(r => r.isThisMonth)
    .reduce((s, r) => s + r.amount, 0)

  const pendingReceivablesCount = (pendingReceivables || [])
    .filter(r => r.isThisMonth)
    .length

  const ledgerApi = useLedgerMutations({
    user,
    showToast,
    setRecentTransactions,
    setCommitments,
    setCommitmentPayments,
    fetchRecentTransactions,
    fetchAccounts,
    fetchMonthlyData
  })

  const { mainCategories, getSubCategories } = useTransactionParser({
    accounts,
    categories
  })

  const { radarSchedule, radarStats, velocityStats, cashFlowData } = useDashboardMetrics({
    accounts,
    commitments,
    commitmentPayments,
    monthlyExpenses,
    scopeAccountId: homeAccountId,
    receivablesThisMonth: 0,
    profile
  })

  const accountApi = useAccountActions({
    user,
    accounts,
    currentView,
    setCurrentView,
    fetchAccounts,
    showToast
  })

  const handleSeeTrends = useCallback((tab) => {
    const url = new URL(window.location.href)
    url.searchParams.set('at', tab || 'overview')
    window.history.replaceState({}, '', url.toString())
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setCurrentView('analytics')
  }, [])

  const handleNavigateFromNotifications = useCallback((target) => {
    if (target === 'network') {
      setCurrentView('network')
    } else if (target === 'debts') {
      setSplitInitialTab('debts')
      setCurrentView('split')
    }
  }, [])

  if (isAuthLoading) return <LoadingSpinner message="Loading secure vault..." />

  if (isRecovery) {
    return (
      <ResetPassword
        onDone={async () => {
          setIsRecovery(false)
          await supabase.auth.signOut()
        }}
      />
    )
  }

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
    <div className="app-shell min-h-dvh bg-page font-sans text-fg">
      <div
        className="fixed pt-5 z-[200] space-y-2 max-w-[calc(100vw-2rem)]"
        style={{
          top: 'calc(round(nearest, env(safe-area-inset-top, 0px), 1px) + 22px)',
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
        youOwe={notifications.youOwe}
        awaitingConfirm={notifications.awaitingConfirm}
        openDisputes={notifications.openDisputes}
        resolvedDisputes={notifications.resolvedDisputes}
        youOweTotal={notifications.youOweTotal}
        owedToYouTotal={notifications.owedToYouTotal}
        actionableCount={notifications.actionableCount}
        onNavigate={handleNavigateFromNotifications}
      />

      <NavigationBar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8">
        <div key={currentView} className="animate-enter">
          {currentView === 'dashboard' && pendingReceivablesThisMonth > 0 && (
            <ReceivablesBanner
              amount={pendingReceivablesThisMonth}
              count={pendingReceivablesCount}
              onView={() => {
                setSplitInitialTab('debts')
                setCurrentView('split')
              }}
            />
          )}

        {currentView === 'dashboard' && (
          <DashboardPage
            user={user}
            profile={profile}
            refreshProfile={refreshProfile}
            recentTransactions={recentTransactions}
            commitments={commitments}
            isLoading={isLoading}
            accounts={accountApi.sortedAccounts}
            activeAccounts={accountApi.activeAccounts}
            allAccounts={accounts}
            classifications={CLASSIFICATIONS}
            homeAccountId={homeAccountId}
            onHomeAccountChange={setHomeAccountId}
            velocityStats={velocityStats}
            cashFlowData={cashFlowData}
            onAddAccount={accountApi.goToAddAccount}
            onLogTransaction={accountApi.goToLogTransaction}
            onManageAccount={accountApi.goToManageAccount}
            onTogglePin={accountApi.togglePin}
            onMoveAccount={accountApi.moveAccount}
            onSeeTrends={handleSeeTrends}
            onOpenBurnRateHelp={() => setShowBurnRateHelp(true)}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'log' && (
          <LogItemPage
            user={user}
            accounts={accountApi.activeAccounts}
            mainCategories={mainCategories}
            getSubCategories={getSubCategories}
            fetchAccounts={fetchAccounts}
            fetchRecentTransactions={fetchRecentTransactions}
            fetchMonthlyData={fetchMonthlyData}
            showToast={showToast}
            initialAccountId={accountApi.selectedAccount?.id}
          />
        )}

        {currentView === 'transactions' && (
          <TransactionsPage
            user={user}
            accounts={accounts}
            mainCategories={mainCategories}
            getSubCategories={getSubCategories}
            showToast={showToast}
            isLoading={isLoading}
            recentTransactions={recentTransactions}
            handleApproveTransaction={ledgerApi.approveTransaction}
            handleDeleteTransaction={ledgerApi.deleteTransaction}
            handleEditTransaction={ledgerApi.editTransaction}
            onRefresh={() => ledgerApi.refreshLedger(true)}
            isRefreshing={ledgerApi.isRefreshing}
            onAddTransaction={() => setCurrentView('log')}
            fetchRecentTransactions={fetchRecentTransactions}
          />
        )}

        {currentView === 'commitments' && (
          <CommitmentsPage
            profile={profile}
            radarStats={radarStats}
            radarSchedule={radarSchedule}
            radarCommitments={commitments}
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
            accounts={accountApi.activeAccounts}
            showToast={showToast}
            onBack={() => setCurrentView('dashboard')}
            initialTab={splitInitialTab}
          />
        )}

        {currentView === 'profile' && (
          <ProfilePage
            user={user}
            profile={profile}
            refreshProfile={refreshProfile}
            accounts={accounts}
            activeAccounts={accountApi.activeAccounts}
            categories={categories}
            getSubCategories={getSubCategories}
            classifications={CLASSIFICATIONS}
            commitments={commitments}
            fetchAccounts={fetchAccounts}
            fetchCategories={fetchCategories}
            fetchRecentTransactions={fetchRecentTransactions}
            fetchMonthlyData={fetchMonthlyData}
            showToast={showToast}
            selectedAccount={accountApi.selectedAccount}
            initialModal={accountApi.requestedModal}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'analytics' && (
          <Suspense fallback={<LoadingSpinner message="Loading analytics…" />}>
            <AnalyticsPage
              user={user}
              profile={profile}
              accounts={accountApi.activeAccounts}
              categories={categories}
              onBack={() => setCurrentView('dashboard')}
              onLogTransaction={() => setCurrentView('log')}
              showToast={showToast}
            />
          </Suspense>
        )}
        </div>
      </main>

      {showBurnRateHelp && (
        <BurnRateHelpSheet onClose={() => setShowBurnRateHelp(false)} />
      )}
    </div>
  )
}