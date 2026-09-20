// src/App.jsx
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import { Wallet, Landmark, Activity, PiggyBank, Database, AlertTriangle, LayoutDashboard, Plus, User } from 'lucide-react'

// Components
import Auth from './components/Auth'
import { ToastNotification } from './components/shared/Toast'
import { LoadingSpinner } from './components/shared/LoadingSpinner'
import { Header } from './components/layouts/Header'
import { AccountCards } from './components/dashboard/AccountCards'
import { CommitmentRadar } from './components/dashboard/CommitmentRadar'
import { BurnRateWidget } from './components/dashboard/BurnRateWidget'
import { CashFlowHeatmap } from './components/dashboard/CashFlowHeatmap'
import { ActionLedger } from './components/dashboard/ActionLedger'

// Pages (Replaces Modals)
import { LogItemPage } from './pages/LogItemPage'
import { ProfilePage } from './pages/ProfilePage'

// Hooks
import { useAuth } from './hooks/useAuth'
import { useTransactions } from './hooks/useTransactions'

// Utils
import { formatMYR } from './utils/formatters'
import { TransactionParser } from './utils/nlpParser'

// Constants
const ICON_MAP = { Landmark, Wallet, Activity, PiggyBank, Database }

export default function App() {
  // Auth
  const { user, isAuthenticated, isAuthLoading } = useAuth()
  
  // Toast state
  const [toasts, setToasts] = useState([])
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }, [])

  // Transactions data
  const { 
    accounts, 
    recentTransactions, 
    setRecentTransactions,
    commitments,
    setCommitments,
    gxExpenses, 
    categories, 
    classifications, 
    isLoading, 
    error,
    fetchAllData 
  } = useTransactions(user, showToast)

  // View Router State
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard' | 'log' | 'profile'

  // UI State
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

  const handleRefreshLedger = useCallback(async (showToastMessage = true) => {
    if (isRefreshingLedger || !user) return
    setIsRefreshingLedger(true)
    try {
      const [txResult, commResult] = await Promise.all([
        supabase.from('transactions').select('*').order('needs_review', { ascending: false }).order('transaction_date', { ascending: false }).limit(30),
        supabase.from('commitments').select('*')
      ])
      if (txResult.error) throw txResult.error
      if (commResult.error) throw commResult.error
      
      setRecentTransactions(txResult.data || [])
      setCommitments(commResult.data || [])
      
      if (showToastMessage) showToast('Ledger refreshed successfully!', 'success')
    } catch (error) {
      if (showToastMessage) showToast('Failed to refresh ledger: ' + error.message, 'error')
    } finally {
      setIsRefreshingLedger(false)
    }
  }, [user, isRefreshingLedger, showToast, setRecentTransactions, setCommitments])

  useEffect(() => {
    if (!user) return
    if (autoRefreshIntervalRef.current) clearInterval(autoRefreshIntervalRef.current)
    autoRefreshIntervalRef.current = setInterval(() => handleRefreshLedger(false), 30000)
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
        autoRefreshIntervalRef.current = null
      }
    }
  }, [user, handleRefreshLedger])

  // ============================================
  // COMMITMENT HANDLERS
  // ============================================
  const handleMarkAsPaid = async (commitmentId) => {
    try {
      const commitment = commitments.find(c => c.id === commitmentId)
      if (!commitment) return showToast('Commitment not found', 'error')

      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()

      const { error: txError } = await supabase.from('transactions').insert({
          user_id: user.id,
          description: `[Paid] ${commitment.name}`,
          amount: commitment.amount,
          source_account_id: commitment.account_id,
          destination_account_id: null,
          category: 'Commitments',
          transaction_date: new Date().toISOString(),
          needs_review: false,
          metadata: { commitment_id: commitment.id, payment_type: 'manual', paid_month: currentMonth + 1, paid_year: currentYear }
        })
      if (txError) throw txError

      const { error: updateError } = await supabase.from('commitments').update({ last_paid: new Date().toISOString(), last_paid_month: currentMonth }).eq('id', commitmentId)
      if (updateError) throw updateError

      showToast(`✅ ${commitment.name} marked as paid!`, 'success')
      await fetchAllData()
    } catch (error) { showToast('Error marking as paid: ' + error.message, 'error') }
  }

  const handleToggleCommitment = async (id, isActive) => {
    try {
      const { error } = await supabase.from('commitments').update({ is_active: !isActive }).eq('id', id)
      if (error) throw error
      showToast(`Commitment ${isActive ? 'deactivated' : 'activated'}`, 'success')
      fetchAllData()
    } catch (error) { showToast('Error toggling commitment: ' + error.message, 'error') }
  }

  const handleDeleteCommitment = async (id, name) => {
    if (!window.confirm(`Delete commitment "${name}"?`)) return
    try {
      const { error } = await supabase.from('commitments').delete().eq('id', id)
      if (error) throw error
      showToast('Commitment deleted', 'success')
      fetchAllData()
    } catch (error) { showToast('Error deleting commitment: ' + error.message, 'error') }
  }

  // ============================================
  // ACCOUNT ROUTING HANDLERS
  // ============================================
  const handleAddAccount = () => setCurrentView('profile')
  
  const handleLogTransactionFromAccount = (account) => {
    setSelectedAccount(account)
    setCurrentView('log')
  }
  
  const handleManageAccount = (account) => {
    setSelectedAccount(account)
    setCurrentView('profile')
  }

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const dynamicAccountDict = useMemo(() => {
    const dict = {}
    accounts.forEach(acc => {
      const name = acc.account_name.toLowerCase()
      dict[name] = acc.id
      if (acc.classification === 'ewallet' && name.includes('tng')) dict['tng'] = acc.id
      if (acc.classification === 'digital_bank' && name.includes('gx')) dict['gx'] = acc.id
      if (acc.classification === 'hub' && name.includes('maybank')) dict['mbb'] = acc.id
      dict[acc.classification] = acc.id
    })
    return dict
  }, [accounts])

  const parser = useMemo(() => new TransactionParser(dynamicAccountDict, categories), [dynamicAccountDict, categories])
  const mainCategories = useMemo(() => categories.filter(c => !c.parent_id), [categories])
  const getSubCategories = useCallback((parentId) => categories.filter(c => c.parent_id === parentId), [categories])

  // ============================================
  // OMNIBAR & TRANSACTION HANDLERS
  // ============================================
  const handleOmnibarSubmit = async (e) => {
    e.preventDefault()
    if (!omnibarText.trim() || !user) return
    setOmnibarStatus({ type: 'loading', message: 'Processing...' })
    try {
      const parsed = parser.parse(omnibarText)
      if (parsed.amount <= 0) throw new Error('Amount must be greater than 0')
      
      const payload = {
        user_id: user.id, description: parsed.description, amount: Math.abs(parsed.amount),
        source_account_id: parsed.sourceAccountId, destination_account_id: parsed.destinationAccountId, category: parsed.category, needs_review: parsed.needsReview || false
      }
      
      const { error } = await supabase.from('transactions').insert([payload])
      if (error) throw error
      
      setOmnibarStatus({ type: 'success', message: `✅ Logged: ${parsed.description}` })
      showToast(`Transaction logged: ${parsed.description}`, 'success')
      setOmnibarText('')
      fetchAllData()
    } catch (error) {
      setOmnibarStatus({ type: 'error', message: `❌ ${error.message}` })
      showToast(error.message, 'error')
    }
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    statusTimeoutRef.current = setTimeout(() => setOmnibarStatus({ type: '', message: '' }), 4000)
  }

  const handleApproveTransaction = async (id, updatedCategory) => {
    if (!updatedCategory || updatedCategory === 'uncategorized') return showToast('Please select a category before approving', 'warning')
    try {
      const { error } = await supabase.from('transactions').update({ needs_review: false, category: updatedCategory }).eq('id', id)
      if (error) throw error
      showToast('Transaction approved successfully!', 'success')
      fetchAllData()
    } catch (error) { showToast('Error approving transaction: ' + error.message, 'error') }
  }

  const handleDeleteTransaction = async (id, description) => {
    if (!window.confirm(`Delete transaction "${description}"?`)) return
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      showToast('Transaction deleted successfully', 'success')
      fetchAllData()
    } catch (error) { showToast('Error deleting transaction: ' + error.message, 'error') }
  }

  const handleEditTransaction = async (id, updatedData) => {
    try {
      if (updatedData.amount <= 0) return showToast('Amount must be greater than 0', 'error')
      if (!updatedData.description || updatedData.description.trim().length < 2) return showToast('Description must be at least 2 characters', 'error')
      if (!updatedData.category || updatedData.category === 'uncategorized') return showToast('Please select a valid category', 'error')

      const updatePayload = {
        description: updatedData.description.trim(), category: updatedData.category, amount: updatedData.amount,
        source_account_id: updatedData.source_account_id || null, destination_account_id: updatedData.destination_account_id || null, needs_review: false
      }

      const { data, error } = await supabase.from('transactions').update(updatePayload).eq('id', id).select()
      if (error) throw error

      showToast('Transaction updated successfully!', 'success')
      await fetchAllData()
    } catch (error) { showToast(`Error updating transaction: ${error.message || 'Unknown error'}`, 'error') }
  }

  // ============================================
  // ANALYTICS CALCULATIONS
  // ============================================
  // ============================================
  // WIDGET ACCOUNT STATES
  // ============================================
  const [radarAccountId, setRadarAccountId] = useState('')
  const [burnAccountId, setBurnAccountId] = useState('')
  const [heatmapAccountId, setHeatmapAccountId] = useState('')

  // ============================================
  // ANALYTICS CALCULATIONS
  // ============================================
  const activeRadarId = radarAccountId || accounts[0]?.id
  const activeBurnId = burnAccountId || accounts[0]?.id
  const activeHeatmapId = heatmapAccountId || accounts[0]?.id

  // 1. Radar Engine
  const radarCommitments = useMemo(() => {
    return commitments.filter(c => c.account_id === activeRadarId)
  }, [commitments, activeRadarId])

  const radarStats = useMemo(() => {
    const account = accounts.find(a => a.id === activeRadarId)
    const currentBalance = account?.balance || 0
    const currentMonth = new Date().getMonth()
    
    const totalRequired = radarCommitments
      .filter(c => c.is_active && c.last_paid_month !== currentMonth)
      .reduce((sum, c) => sum + Number(c.amount), 0)
    
    const isSafe = currentBalance >= totalRequired
    
    return { 
      currentBalance, totalRequired, isSafe, shortfall: isSafe ? 0 : totalRequired - currentBalance, 
      name: account?.account_name || 'Select Account'
    }
  }, [accounts, radarCommitments, activeRadarId])

  // 2. Burn Rate Engine
  const velocityStats = useMemo(() => {
    const account = accounts.find(a => a.id === activeBurnId)
    const currentBalance = account?.balance || 0
    
    const accountExpenses = gxExpenses?.filter(tx => tx.source_account_id === activeBurnId) || []
    const totalSpentThisMonth = accountExpenses.reduce((sum, t) => sum + Number(t.amount), 0)
    
    const today = new Date()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const daysPassed = today.getDate()
    const daysRemaining = daysInMonth - daysPassed
    
    const averageDailySpend = daysPassed > 0 ? (totalSpentThisMonth / daysPassed) : 0
    const dailyBudget = daysRemaining > 0 ? (currentBalance / daysRemaining) : 0
    const projectedRunwayDays = averageDailySpend > 0 ? (currentBalance / averageDailySpend) : 999
    
    return { 
      currentBalance, totalSpentThisMonth, averageDailySpend, projectedRunwayDays: Math.floor(projectedRunwayDays), 
      daysRemaining, isSafe: projectedRunwayDays >= daysRemaining || averageDailySpend === 0, 
      name: account?.account_name || 'Select Account', dailyBudget, daysPassed
    }
  }, [accounts, gxExpenses, activeBurnId])

  // 3. Heatmap Engine
  const cashFlowData = useMemo(() => {
    const breakdown = {}
    const accountExpenses = gxExpenses?.filter(tx => tx.source_account_id === activeHeatmapId && !tx.needs_review) || []
    
    accountExpenses.forEach(tx => {
      let mainCat = tx.category || 'uncategorized'
      if (mainCat.includes(' > ')) mainCat = mainCat.split(' > ')[0]
      breakdown[mainCat] = (breakdown[mainCat] || 0) + Number(tx.amount)
    })
    
    return Object.entries(breakdown).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).sort((a, b) => b.value - a.value)
  }, [gxExpenses, activeHeatmapId])

  // ============================================
  // RENDER
  // ============================================
  if (isAuthLoading) return <LoadingSpinner message="Loading secure vault..." />
  if (!isAuthenticated) return <Auth />

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Connection Error</h2>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 font-sans text-slate-900 pb-28 md:pb-12">
      
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <ToastNotification key={toast.id} message={toast.message} type={toast.type} onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />
        ))}
      </div>

      <Header 
        omnibarText={omnibarText}
        setOmnibarText={setOmnibarText}
        handleOmnibarSubmit={handleOmnibarSubmit}
        isLoading={isLoading}
        currentView={currentView}
        setCurrentView={setCurrentView}
        supabase={supabase}
      />

      <main className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8">
        
        {/* VIEW ROUTER */}
        {currentView === 'dashboard' && (
          <div className="space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section>
              <h2 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 md:mb-4 flex items-center gap-2">
                <Wallet className="w-3 h-3 md:w-4 md:h-4" /> Node Balances
              </h2>
              {isLoading ? (
                <div className="flex items-center justify-center h-32 md:h-48">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-blue-500"></div>
                    <p className="text-xs md:text-sm text-slate-400">Loading balances...</p>
                  </div>
                </div>
              ) : (
                <AccountCards 
                  accounts={accounts} classifications={classifications} onAddAccount={handleAddAccount}
                  onLogTransaction={handleLogTransactionFromAccount} onManageAccount={handleManageAccount}
                />
              )}
            </section>

            {/* Dashboard Analytics - Now perfectly balanced side-by-side on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <BurnRateWidget 
                velocityStats={velocityStats} 
                accounts={accounts}
                selectedAccountId={activeBurnId}
                onSelectAccount={setBurnAccountId}
              />
              <CashFlowHeatmap 
                cashFlowData={cashFlowData} 
                accounts={accounts}
                selectedAccountId={activeHeatmapId}
                onSelectAccount={setHeatmapAccountId}
                onAddTransaction={() => setCurrentView('log')} 
              />
            </div>
          </div>
        )}

        {currentView === 'log' && (
          <LogItemPage 
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
            
            radarStats={radarStats}
            radarCommitments={radarCommitments}
            activeRadarId={activeRadarId}
            setRadarAccountId={setRadarAccountId}
            
            onAddCommitment={() => setCurrentView('profile')}
            handleDeleteCommitment={handleDeleteCommitment}
            handleToggleCommitment={handleToggleCommitment}
            handleMarkAsPaid={handleMarkAsPaid}
            onClose={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'profile' && (
          <ProfilePage 
            user={user}
            accounts={accounts}
            categories={categories}
            getSubCategories={getSubCategories}
            classifications={classifications}
            commitments={commitments}
            fetchAllData={fetchAllData}
            showToast={showToast}
            selectedAccount={selectedAccount}
          />
        )}
      </main>

      {/* Floating Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 z-50 bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center h-14 relative px-2">

          {/* Dashboard */}
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setCurrentView('dashboard');
            }}
            className={`flex items-center justify-center w-16 h-14 transition-colors ${
              currentView === 'dashboard'
                ? 'text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutDashboard className="w-7 h-7" />
          </button>

          {/* Center Plus Button */}
          <div className="relative w-16 h-14 flex items-center justify-center">
            <button
              onClick={() => setCurrentView('log')}
              className={`absolute -top-5 text-white p-4 rounded-full shadow-[0_8px_30px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 transition-all ${
                currentView === 'log'
                  ? 'bg-gradient-to-tr from-slate-900 to-slate-800'
                  : 'bg-gradient-to-tr from-blue-600 to-blue-500'
              }`}
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>

          {/* User */}
          <button
            onClick={() => setCurrentView('profile')}
            className={`flex items-center justify-center w-16 h-14 transition-colors ${
              currentView === 'profile'
                ? 'text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <User className="w-7 h-7" />
          </button>

        </div>
      </nav>
    </div>
  )
}