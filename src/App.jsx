// src/App.jsx
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import { Wallet, Landmark, Activity, PiggyBank, Database, AlertTriangle } from 'lucide-react'

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

// Modals
import { ManualTransactionModal } from './components/modals/ManualTransactionModal'
import { SettingsModal } from './components/modals/SettingsModal'

// Hooks
import { useAuth } from './hooks/useAuth'
import { useTransactions } from './hooks/useTransactions'

// Utils
import { formatMYR } from './utils/formatters'
import { TransactionParser } from './utils/nlpParser'

// Constants
const ICON_MAP = { 
  Landmark, 
  Wallet, 
  Activity, 
  PiggyBank, 
  Database 
}

export default function App() {
  // Auth
  const { user, setUser, isAuthenticated, isAuthLoading } = useAuth()
  
  // Toast state
  const [toasts, setToasts] = useState([])
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  // Transactions data
  const { 
    accounts, 
    setAccounts,
    recentTransactions, 
    setRecentTransactions,    // ✅ Now available
    commitments, 
    setCommitments,           // ✅ Now available
    gxExpenses, 
    categories, 
    setCategories,
    classifications, 
    isLoading, 
    error,
    fetchAllData 
  } = useTransactions(user, showToast)

  // UI State
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [omnibarText, setOmnibarText] = useState('')
  const [omnibarStatus, setOmnibarStatus] = useState({ type: '', message: '' })
  const [isRefreshingLedger, setIsRefreshingLedger] = useState(false)
  const statusTimeoutRef = useRef(null)
  const hasFetchedRef = useRef(false)
  const autoRefreshIntervalRef = useRef(null)

  // Fetch data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && !hasFetchedRef.current) {
      console.log('🔐 User authenticated, fetching data...')
      hasFetchedRef.current = true
      fetchAllData()
    }
  }, [isAuthenticated, user, fetchAllData])

  // ============================================
  // LEDGER REFRESH HANDLER
  // ============================================
  const handleRefreshLedger = useCallback(async (showToastMessage = true) => {
    if (isRefreshingLedger || !user) return
    
    setIsRefreshingLedger(true)
    try {
      // Only fetch transactions and commitments (lighter query)
      const [txResult, commResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .order('needs_review', { ascending: false })
          .order('transaction_date', { ascending: false })
          .limit(30),
        supabase
          .from('commitments')
          .select('*')
      ])
      
      if (txResult.error) throw txResult.error
      if (commResult.error) throw commResult.error
      
      setRecentTransactions(txResult.data || [])
      setCommitments(commResult.data || [])
      
      if (showToastMessage) {
        showToast('Ledger refreshed successfully!', 'success')
      }
    } catch (error) {
      console.error('Error refreshing ledger:', error)
      if (showToastMessage) {
        showToast('Failed to refresh ledger: ' + error.message, 'error')
      }
    } finally {
      setIsRefreshingLedger(false)
    }
  }, [user, isRefreshingLedger, showToast, setRecentTransactions, setCommitments])

  // ============================================
  // AUTO-REFRESH SETUP (Every 30 seconds)
  // ============================================
  useEffect(() => {
    // Only set up auto-refresh if user is authenticated
    if (!user) return

    // Clear any existing interval
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current)
    }

    // Set up new interval
    autoRefreshIntervalRef.current = setInterval(() => {
      // Silently refresh (no toast message)
      handleRefreshLedger(false)
    }, 30000) // 30 seconds

    // Cleanup on unmount or when user changes
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
        autoRefreshIntervalRef.current = null
      }
    }
  }, [user, handleRefreshLedger])

  // Computed values
  const dynamicAccountDict = useMemo(() => {
    const dict = {}
    accounts.forEach(acc => {
      const name = acc.account_name.toLowerCase()
      dict[name] = acc.id  // ✅ Using consistent 'id'
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

  // Omnibar handler
  const handleOmnibarSubmit = async (e) => {
    e.preventDefault()
    if (!omnibarText.trim() || !user) return
    
    setOmnibarStatus({ type: 'loading', message: 'Processing...' })
    
    try {
      const parsed = parser.parse(omnibarText)
      
      if (parsed.amount <= 0) {
        throw new Error('Amount must be greater than 0')
      }
      
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

  // Transaction handlers
  const handleApproveTransaction = async (id, updatedCategory) => {
    if (!updatedCategory || updatedCategory === 'uncategorized') {
      showToast('Please select a category before approving', 'warning')
      return
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ needs_review: false, category: updatedCategory })
        .eq('id', id)
      
      if (error) throw error
      showToast('Transaction approved successfully!', 'success')
      fetchAllData()
    } catch (error) {
      showToast('Error approving transaction: ' + error.message, 'error')
    }
  }

  const handleDeleteTransaction = async (id, description) => {
    if (!window.confirm(`Delete transaction "${description}"?`)) return
    
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      showToast('Transaction deleted successfully', 'success')
      fetchAllData()
    } catch (error) {
      showToast('Error deleting transaction: ' + error.message, 'error')
    }
  }

  // Analytics calculations
  const radarStats = useMemo(() => {
    const ewalletAccount = accounts.find(a => a.classification === 'ewallet')
    const currentBalance = ewalletAccount?.balance || 0
    const totalRequired = commitments.reduce((sum, c) => sum + Number(c.amount), 0)
    const isSafe = currentBalance >= totalRequired
    return { 
      currentBalance, 
      totalRequired, 
      isSafe, 
      shortfall: isSafe ? 0 : totalRequired - currentBalance, 
      name: ewalletAccount?.account_name || 'eWallet' 
    }
  }, [accounts, commitments])

  const velocityStats = useMemo(() => {
    const digitalAccount = accounts.find(a => a.classification === 'digital_bank')
    const currentBalance = digitalAccount?.balance || 0
    const totalSpentThisMonth = gxExpenses.reduce((sum, t) => sum + Number(t.amount), 0)
    
    const today = new Date()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const daysPassed = today.getDate()
    const daysRemaining = daysInMonth - daysPassed
    
    // Calculate average daily spend
    const averageDailySpend = daysPassed > 0 ? (totalSpentThisMonth / daysPassed) : 0
    
    // Calculate daily budget (what you can spend per day to stay within balance)
    const dailyBudget = daysRemaining > 0 ? (currentBalance / daysRemaining) : 0
    
    // Projected runway
    const projectedRunwayDays = averageDailySpend > 0 ? (currentBalance / averageDailySpend) : 999
    
    // Projected end balance
    const projectedEndBalance = currentBalance - (averageDailySpend * daysRemaining)
    
    // Check if safe
    const isSafe = projectedRunwayDays >= daysRemaining || averageDailySpend === 0
    
    // Calculate overspend amount
    const overspendAmount = dailyBudget > 0 && averageDailySpend > dailyBudget 
      ? averageDailySpend - dailyBudget 
      : 0
    
    // Calculate spending trend (compare to previous month)
    // This requires previous month data - we'll use a simple heuristic
    const spendingTrend = (() => {
      // If we have previous month data, we could calculate it properly
      // For now, compare to a default daily budget of RM30/day
      const defaultDailyBudget = 30
      if (averageDailySpend === 0) return 0
      return ((averageDailySpend - defaultDailyBudget) / defaultDailyBudget) * 100
    })()
    
    return { 
      currentBalance, 
      totalSpentThisMonth, 
      averageDailySpend, 
      projectedRunwayDays: Math.floor(projectedRunwayDays), 
      daysRemaining, 
      isSafe,
      name: digitalAccount?.account_name || 'Digital Bank',
      dailyBudget,
      daysPassed,
      spendingTrend: Math.round(spendingTrend),
      projectedEndBalance,
      overspendAmount: Math.round(overspendAmount * 100) / 100
    }
  }, [accounts, gxExpenses])

  const cashFlowData = useMemo(() => {
    const breakdown = {}
    gxExpenses.forEach(tx => {
      if (tx.needs_review) return 
      let mainCat = tx.category || 'uncategorized'
      if (mainCat.includes(' > ')) {
        mainCat = mainCat.split(' > ')[0]
      }
      breakdown[mainCat] = (breakdown[mainCat] || 0) + Number(tx.amount)
    })
    return Object.entries(breakdown)
      .map(([name, value]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        value 
      }))
      .sort((a, b) => b.value - a.value)
  }, [gxExpenses])

  const handleEditTransaction = async (id, updatedData) => {
    try {
      // Validate amount
      if (updatedData.amount <= 0) {
        showToast('Amount must be greater than 0', 'error')
        return
      }

      console.log('📝 Editing transaction:', id, updatedData)

      const { error } = await supabase
        .from('transactions')
        .update({
          description: updatedData.description,
          category: updatedData.category,
          amount: updatedData.amount,
          needs_review: false, // Reset review flag on edit
          updated_at: new Date().toISOString() // Optional: track when edited
        })
        .eq('id', id)
      
      if (error) throw error
      
      showToast('Transaction updated successfully!', 'success')
      
      // Refresh all data to reflect changes
      fetchAllData()
      
    } catch (error) {
      console.error('❌ Error editing transaction:', error)
      showToast('Error updating transaction: ' + error.message, 'error')
    }
  }

  // Loading state
  if (isAuthLoading) return <LoadingSpinner message="Loading secure vault..." />
  if (!isAuthenticated) return <Auth />

  // Show error if any
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Connection Error</h2>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <button 
            onClick={() => {
              window.location.reload()
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 font-sans text-slate-900 pb-12">
      
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <ToastNotification
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          />
        ))}
      </div>

      {/* Modals */}
      {isTransactionModalOpen && (
        <ManualTransactionModal 
          setIsOpen={setIsTransactionModalOpen}
          user={user}
          accounts={accounts}
          categories={mainCategories}
          getSubCategories={getSubCategories}
          fetchAllData={fetchAllData}
          showToast={showToast}
        />
      )}

      {isSettingsModalOpen && (
        <SettingsModal 
          setIsOpen={setIsSettingsModalOpen}
          user={user}
          accounts={accounts}
          categories={categories}
          getSubCategories={getSubCategories}
          classifications={classifications}
          fetchAllData={fetchAllData}
          showToast={showToast}
        />
      )}

      {/* Header */}
      <Header 
        omnibarText={omnibarText}
        setOmnibarText={setOmnibarText}
        handleOmnibarSubmit={handleOmnibarSubmit}
        isLoading={isLoading}
        setIsTransactionModalOpen={setIsTransactionModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        supabase={supabase}
      />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Account Cards */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Node Balances
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="text-sm text-slate-400">Loading balances...</p>
              </div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <p className="text-slate-500">No accounts found. Create your first account in Settings.</p>
            </div>
          ) : (
            <AccountCards accounts={accounts} classifications={classifications} />
          )}
        </section>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CommitmentRadar radarStats={radarStats} />
              <BurnRateWidget velocityStats={velocityStats} />
            </div>
            <CashFlowHeatmap cashFlowData={cashFlowData} />
          </section>

          <ActionLedger 
            recentTransactions={recentTransactions}
            mainCategories={mainCategories}
            getSubCategories={getSubCategories}
            handleApproveTransaction={handleApproveTransaction}
            handleDeleteTransaction={handleDeleteTransaction}
            handleEditTransaction={handleEditTransaction}
            onRefresh={() => handleRefreshLedger(true)}
            isRefreshing={isRefreshingLedger}
          />
        </div>
      </main>
    </div>
  )
}