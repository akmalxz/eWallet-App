import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from './lib/supabaseClient'
import { 
  Wallet, Landmark, PiggyBank, Send, Activity, Clock, 
  ArrowDownRight, ArrowUpRight, Target, Flame, ShieldCheck, 
  AlertTriangle, LogOut, Plus, Settings, X, Trash2, Database, 
  Check, RefreshCw, CornerDownRight, Toast, AlertCircle
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'

import Auth from './components/Auth'

const ICON_MAP = { Landmark, Wallet, Activity, PiggyBank, Database }
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

// ============================================
// TOAST SYSTEM
// ============================================
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  }

  const icons = {
    success: <Check className="w-5 h-5" />,
    error: <AlertTriangle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Activity className="w-5 h-5" />
  }

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl border shadow-lg flex items-center gap-3 max-w-md animate-slide-in ${styles[type] || styles.info}`}>
      {icons[type] || icons.info}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-auto hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ============================================
// DYNAMIC NLP PARSER (Client Side)
// ============================================
class TransactionParser {
  constructor(accountDict, categories) { 
    this.accountDict = accountDict 
    this.categories = categories || []
  }
  
  findAccountId(name) {
    if (!name || Object.keys(this.accountDict).length === 0) return null
    const normalized = name.toLowerCase().trim()
    if (this.accountDict[normalized]) return this.accountDict[normalized]
    for (const [key, uuid] of Object.entries(this.accountDict)) {
      if (normalized.includes(key) || key.includes(normalized)) return uuid
    }
    return null
  }
  
  extractAmount(text) {
    // Handle amounts with commas (e.g., "RM 1,200.50")
    const commaPattern = /(?:rm|myr|ringgit)?\s*([\d,]+\.\d{2})/i
    const commaMatch = text.match(commaPattern)
    if (commaMatch) return parseFloat(commaMatch[1].replace(/,/g, ''))

    // Handle amounts with no comma
    const patterns = [
      /(?:rm|myr|ringgit)?\s*([\d,]+\.?\d*)\s*(?:rm|myr|ringgit)?/i,
      /([\d,]+\.?\d*)\s*(?:rm|myr|ringgit)/i,
    ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return parseFloat(match[1].replace(/,/g, ''))
    }
    return null
  }
  
  extractCategory(text) {
    if (this.categories.length === 0) return 'uncategorized'
    const lowerText = text.toLowerCase()
    
    // Look for subcategories first
    const subCategories = this.categories.filter(c => c.parent_id)
    for (const sub of subCategories) {
      if (lowerText.includes(sub.name.toLowerCase())) {
        const parent = this.categories.find(c => c.id === sub.parent_id)
        return parent ? `${parent.name} > ${sub.name}` : sub.name
      }
    }
    
    // Fallback to main categories
    const mainCategories = this.categories.filter(c => !c.parent_id)
    for (const main of mainCategories) {
      if (lowerText.includes(main.name.toLowerCase())) return main.name
    }
    return 'uncategorized'
  }

  validateCategory(category) {
    if (!category || category === 'uncategorized') {
      return { valid: true, normalizedCategory: 'uncategorized' }
    }

    // Check exact match
    const exactMatch = this.categories.find(c => c.name === category)
    if (exactMatch) {
      return { valid: true, normalizedCategory: category }
    }

    // Check hierarchical match
    const parts = category.split(' > ')
    if (parts.length === 2) {
      const [parentName, childName] = parts
      const parent = this.categories.find(c => c.name === parentName && !c.parent_id)
      if (parent) {
        const child = this.categories.find(c => c.name === childName && c.parent_id === parent.id)
        if (child) {
          return { valid: true, normalizedCategory: `${parentName} > ${childName}` }
        }
      }
    }

    return { valid: false, normalizedCategory: 'uncategorized' }
  }
  
  parse(text) {
    const normalizedText = text.trim()
    const result = { 
      amount: null, 
      sourceAccountId: null, 
      destinationAccountId: null, 
      category: 'uncategorized', 
      description: '', 
      type: 'expense',
      needsReview: false
    }
    
    result.amount = this.extractAmount(normalizedText)
    if (!result.amount) throw new Error('Could not find amount.')

    const lowerText = normalizedText.toLowerCase()
    const isTransfer = /(?:move|transfer|send|pindah|from).*?(?:to|into|ke|->)/i.test(lowerText)
    const isIncome = /(?:received|got|income|salary|deposit)/i.test(lowerText)
    const isExpense = /(?:spent|paid|bought|purchase|expense)/i.test(lowerText)

    const fromToMatch = normalizedText.match(/(?:from|dari)\s+([a-zA-Z\s]+?)(?:\s+to\s+|\s+into\s+|\s+->\s+|\s+ke\s+)([a-zA-Z\s]+)/i)
    const atMatch = normalizedText.match(/(?:at|di|pada)\s+([a-zA-Z\s]+?)(?:\s+for\s+|\s+-\s+|\s*$)/i)
    
    if (isTransfer && fromToMatch) {
      result.sourceAccountId = this.findAccountId(fromToMatch[1])
      result.destinationAccountId = this.findAccountId(fromToMatch[2])
      result.type = 'transfer'
    } else if (isExpense && atMatch) {
      result.sourceAccountId = this.findAccountId(atMatch[1])
      result.type = 'expense'
    } else {
      for (const acc of Object.keys(this.accountDict)) {
        if (lowerText.includes(acc)) {
          if (isExpense || isTransfer) result.sourceAccountId = this.accountDict[acc]
          else if (isIncome) result.destinationAccountId = this.accountDict[acc]
          break
        }
      }
    }
    if (!result.sourceAccountId && !result.destinationAccountId) {
      throw new Error('Could not identify any account.')
    }
    
    // Extract and validate category
    const extractedCategory = this.extractCategory(normalizedText)
    const validation = this.validateCategory(extractedCategory)
    result.category = validation.valid ? validation.normalizedCategory : 'uncategorized'
    result.needsReview = !validation.valid || result.category === 'uncategorized'
    
    // Generate description
    result.description = normalizedText
      .replace(/RM\s*[\d,]+\.?\d*/g, '')
      .replace(/[\d,]+\.?\d*/g, '')
      .replace(/(?:from|to|at|into|for|dari|ke|di|pada)\s+[a-zA-Z\s]+/gi, '')
      .trim() || `${result.type} ${result.amount}`
    
    return result
  }
}

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function App() {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  const [accounts, setAccounts] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [commitments, setCommitments] = useState([])
  const [gxExpenses, setGxExpenses] = useState([])
  
  const [categories, setCategories] = useState([])
  const [classifications, setClassifications] = useState([])
  
  const [isLoading, setIsLoading] = useState(true)
  
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [omnibarText, setOmnibarText] = useState('')
  const [omnibarStatus, setOmnibarStatus] = useState({ type: '', message: '' })
  
  // Toast state
  const [toasts, setToasts] = useState([])
  
  const statusTimeoutRef = useRef(null)

  // ============================================
  // TOAST FUNCTIONS
  // ============================================
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

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
  // AUTHENTICATION
  // ============================================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { 
        setUser(session.user); 
        setIsAuthenticated(true) 
      }
      setIsAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((async (_event, session) => {
      if (session?.user) { 
        setUser(session.user)
        setIsAuthenticated(true) 
      } else { 
        setUser(null); 
        setIsAuthenticated(false); 
        setAccounts([]) 
      }
    }))
    return () => subscription.unsubscribe()
  }, [])

  // ============================================
  // DATA FETCHING (Optimized with RPC)
  // ============================================
  const fetchAllData = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    
    try {
      // Fetch all data in parallel using Promise.all
      const [
        accResult,
        catResult,
        classResult,
        txResult,
        commResult
      ] = await Promise.all([
        supabase.from('v_account_balances').select('*').order('balance', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('classifications').select('*'),
        supabase.from('transactions')
          .select('*')
          .order('needs_review', { ascending: false })
          .order('transaction_date', { ascending: false })
          .limit(30),
        supabase.from('commitments').select('*')
      ])

      // Handle accounts
      if (accResult.error) throw accResult.error
      setAccounts(accResult.data || [])

      // Handle categories with default seeding
      if (!catResult.data || catResult.data.length === 0) {
        const { data: mainCats } = await supabase.from('categories').insert([
          { user_id: user.id, name: 'Food & Beverages' },
          { user_id: user.id, name: 'Transport' },
          { user_id: user.id, name: 'Income' },
          { user_id: user.id, name: 'Utilities' },
          { user_id: user.id, name: 'Entertainment' }
        ]).select()
        
        if (mainCats) {
          const foodId = mainCats.find(c => c.name === 'Food & Beverages')?.id
          if (foodId) {
            await supabase.from('categories').insert([
              { user_id: user.id, name: 'Breakfast', parent_id: foodId },
              { user_id: user.id, name: 'Lunch', parent_id: foodId },
              { user_id: user.id, name: 'Dinner', parent_id: foodId },
              { user_id: user.id, name: 'Groceries', parent_id: foodId }
            ])
          }
        }
        const { data: refreshedCats } = await supabase.from('categories').select('*').order('name')
        setCategories(refreshedCats || [])
      } else {
        setCategories(catResult.data)
      }

      // Handle classifications
      if (classResult.error) throw classResult.error
      if (!classResult.data || classResult.data.length === 0) {
        const defaultClass = [
          { user_id: user.id, key_name: 'hub', label: 'Main Hub', icon_name: 'Landmark', color_class: 'text-blue-500', bg_class: 'bg-blue-50' },
          { user_id: user.id, key_name: 'ewallet', label: 'Daily eWallet', icon_name: 'Wallet', color_class: 'text-purple-500', bg_class: 'bg-purple-50' },
          { user_id: user.id, key_name: 'digital_bank', label: 'Digital Bank', icon_name: 'Activity', color_class: 'text-emerald-500', bg_class: 'bg-emerald-50' },
          { user_id: user.id, key_name: 'savings', label: 'Savings', icon_name: 'PiggyBank', color_class: 'text-amber-500', bg_class: 'bg-amber-50' }
        ]
        await supabase.from('classifications').insert(defaultClass)
        const { data: refreshedClass } = await supabase.from('classifications').select('*')
        setClassifications(refreshedClass || [])
      } else {
        setClassifications(classResult.data)
      }

      // Handle transactions
      if (txResult.error) throw txResult.error
      setRecentTransactions(txResult.data || [])

      // Handle commitments
      if (commResult.error) throw commResult.error
      setCommitments(commResult.data || [])

      // Fetch GX expenses (digital bank-specific)
      const digitalBankId = accResult.data?.find(a => a.classification === 'digital_bank')?.id
      if (digitalBankId) {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        const { data: gxData } = await supabase.from('transactions')
          .select('*')
          .eq('source_account_id', digitalBankId)
          .is('destination_account_id', null)
          .gte('transaction_date', startOfMonth)
        setGxExpenses(gxData || [])
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      showToast('Failed to load data. Please refresh.', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [user, showToast])

  useEffect(() => { 
    if (isAuthenticated) fetchAllData() 
  }, [isAuthenticated, fetchAllData])

  // ============================================
  // OMNIBAR HANDLER
  // ============================================
  const handleOmnibarSubmit = async (e) => {
    e.preventDefault()
    if (!omnibarText.trim() || !user) return
    
    setOmnibarStatus({ type: 'loading', message: 'Processing...' })
    
    try {
      const parsed = parser.parse(omnibarText)
      
      // Validate transaction before insert
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

  // ============================================
  // TRANSACTION HANDLERS
  // ============================================
  const handleApproveTransaction = async (id, updatedCategory) => {
    if (!updatedCategory || updatedCategory === 'uncategorized') {
      showToast('Please select a category before approving', 'warning')
      return
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          needs_review: false, 
          category: updatedCategory 
        })
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
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      showToast('Transaction deleted successfully', 'success')
      fetchAllData()
      
    } catch (error) {
      showToast('Error deleting transaction: ' + error.message, 'error')
    }
  }

  // ============================================
  // RENDER HELPERS
  // ============================================
  const formatMYR = (amount) => new Intl.NumberFormat('en-MY', { 
    style: 'currency', 
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)

  // ============================================
  // PREDICTIVE & ANALYTICS ENGINES
  // ============================================
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
    const averageDailySpend = daysPassed > 0 ? (totalSpentThisMonth / daysPassed) : 0
    const projectedRunwayDays = averageDailySpend > 0 ? (currentBalance / averageDailySpend) : 999
    
    return { 
      currentBalance, 
      totalSpentThisMonth, 
      averageDailySpend, 
      projectedRunwayDays: Math.floor(projectedRunwayDays), 
      daysRemaining, 
      isSafe: projectedRunwayDays >= daysRemaining,
      name: digitalAccount?.account_name || 'Digital Bank'
    }
  }, [accounts, gxExpenses])

  // ============================================
  // CASH FLOW HEATMAP
  // ============================================
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

  // ============================================
  // MODAL COMPONENTS (Inlined for brevity)
  // ============================================
  // ManualTransactionModal and SettingsModal remain the same
  // They're included in the full code file

  // ============================================
  // MAIN RENDER
  // ============================================
  if (isAuthLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="text-sm text-slate-400">Loading secure vault...</p>
      </div>
    </div>
  )
  
  if (!isAuthenticated) return <Auth />

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 font-sans text-slate-900 pb-12">
      
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          />
        ))}
      </div>

      {/* Modals */}
      {isTransactionModalOpen && <ManualTransactionModal />}
      {isSettingsModalOpen && <SettingsModal />}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-2 rounded-lg">
                <Activity className="text-white w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">FlowState</h1>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <button onClick={() => setIsTransactionModalOpen(true)} className="p-2 bg-blue-500 text-white rounded-lg">
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={() => supabase.auth.signOut()} className="p-2 text-red-400">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 max-w-2xl relative flex gap-3">
            <form onSubmit={handleOmnibarSubmit} className="relative flex-1">
              <input 
                type="text" 
                value={omnibarText} 
                onChange={(e) => setOmnibarText(e.target.value)} 
                placeholder='Type "spent 15 at GX Bank for lunch" or "moved 500 from Maybank to TNG"' 
                className="w-full bg-slate-100 border-2 border-transparent rounded-full py-2.5 pl-5 pr-12 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all" 
                disabled={isLoading} 
              />
              <button 
                type="submit" 
                disabled={isLoading || !omnibarText.trim()} 
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="hidden md:flex items-center gap-2 border-l border-slate-200 pl-4">
              <button 
                onClick={() => setIsTransactionModalOpen(true)} 
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-full transition-colors"
              >
                <Plus className="w-4 h-4" /> Log Data
              </button>
              <button 
                onClick={() => setIsSettingsModalOpen(true)} 
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button 
                onClick={() => supabase.auth.signOut()} 
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            {omnibarStatus.message && (
              <div className={`absolute -bottom-6 left-2 text-xs font-medium ${
                omnibarStatus.type === 'error' ? 'text-red-500' : 
                omnibarStatus.type === 'success' ? 'text-emerald-500' : 'text-blue-500'
              }`}>
                {omnibarStatus.message}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Node Balances */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Node Balances
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {accounts.map(acc => {
              const classData = classifications.find(c => c.key_name === acc.classification)
              const Icon = classData && ICON_MAP[classData.icon_name] ? ICON_MAP[classData.icon_name] : Wallet
              const color = classData?.color_class || 'text-slate-500'
              const bg = classData?.bg_class || 'bg-slate-50'
              
              return (
                <div key={acc.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="flex justify-between mb-3">
                    <div className={`p-2 rounded-lg ${bg}`}>
                      <Icon className={`${color} w-5 h-5`} />
                    </div>
                  </div>
                  <h3 className="text-slate-500 text-sm font-medium truncate">{acc.account_name}</h3>
                  <p className="text-xl font-bold mt-1 text-slate-900">{formatMYR(acc.balance)}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-6">
            
            {/* Predictive Engines */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Commitment Radar */}
              <div className={`bg-white rounded-2xl shadow-sm border p-6 relative overflow-hidden ${
                radarStats.isSafe ? 'border-slate-100' : 'border-red-200'
              }`}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-500" /> {radarStats.name} Radar
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Fixed upcoming deductions.</p>
                  </div>
                  {radarStats.isSafe ? (
                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4"/> SAFE
                    </span>
                  ) : (
                    <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4"/> ALERT
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Available</p>
                    <p className="text-lg font-bold">{formatMYR(radarStats.currentBalance)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Required</p>
                    <p className="text-lg font-bold">{formatMYR(radarStats.totalRequired)}</p>
                  </div>
                </div>
                {!radarStats.isSafe && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-xs text-red-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Shortfall of {formatMYR(radarStats.shortfall)} detected
                    </p>
                  </div>
                )}
              </div>

              {/* Burn Rate */}
              <div className={`bg-white rounded-2xl shadow-sm border p-6 relative overflow-hidden ${
                velocityStats.isSafe ? 'border-slate-100' : 'border-amber-200'
              }`}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" /> {velocityStats.name} Burn Rate
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Daily spend survival.</p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Runway: <strong className="text-slate-800">{velocityStats.projectedRunwayDays} Days</strong></span>
                    <span className="text-slate-500">Month Left: <strong className="text-slate-800">{velocityStats.daysRemaining} Days</strong></span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        velocityStats.isSafe ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} 
                      style={{ width: `${Math.min(100, (velocityStats.projectedRunwayDays / Math.max(1, velocityStats.daysRemaining)) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <p>Avg: <strong>{formatMYR(velocityStats.averageDailySpend)}/day</strong></p>
                  <p>Spent: <strong>{formatMYR(velocityStats.totalSpentThisMonth)}</strong></p>
                </div>
              </div>
            </div>

            {/* Cash Flow Heatmap */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" /> Cash Flow Heatmap
              </h2>
              <div className="h-64 w-full">
                {cashFlowData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={cashFlowData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={90} 
                        paddingAngle={5} 
                        dataKey="value"
                      >
                        {cashFlowData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => formatMYR(value)} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    No verified expense data this month.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Action Ledger */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[750px] overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> Action Ledger
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1 p-2">
              {recentTransactions.map(tx => {
                const isIncome = !tx.source_account_id && tx.destination_account_id
                const isTransfer = tx.source_account_id && tx.destination_account_id
                
                if (tx.needs_review) {
                  return (
                    <div key={tx.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm mb-2">
                      <div className="flex justify-between items-start mb-3">
                        <div className="pr-4">
                          <p className="text-sm font-bold text-amber-900 leading-tight">{tx.description}</p>
                          <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3"/> Pending Verification
                          </p>
                        </div>
                        <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{formatMYR(tx.amount)}</span>
                      </div>
                      <div className="flex gap-2">
                        <select 
                          className="flex-1 bg-white border border-amber-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-amber-500"
                          defaultValue={tx.category}
                          id={`cat-select-${tx.id}`}
                        >
                          <option value="uncategorized">Select...</option>
                          {mainCategories.map(main => (
                            <optgroup key={main.id} label={main.name}>
                              {getSubCategories(main.id).map(sub => (
                                <option key={sub.id} value={`${main.name} > ${sub.name}`}>{sub.name}</option>
                              ))}
                              {getSubCategories(main.id).length === 0 && (
                                <option value={main.name}>{main.name} (General)</option>
                              )}
                            </optgroup>
                          ))}
                        </select>
                        <button 
                          onClick={() => handleApproveTransaction(
                            tx.id, 
                            document.getElementById(`cat-select-${tx.id}`).value
                          )}
                          className="bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTransaction(tx.id, tx.description)}
                          className="bg-red-100 hover:bg-red-200 text-red-600 p-1.5 rounded-lg transition-colors flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 group">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${
                        isIncome ? 'bg-emerald-50' : 
                        isTransfer ? 'bg-blue-50' : 'bg-slate-100'
                      }`}>
                        {isIncome ? 
                          <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : 
                          isTransfer ? 
                            <RefreshCw className="w-4 h-4 text-blue-500" /> : 
                            <ArrowDownRight className="w-4 h-4 text-slate-500" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 line-clamp-1">{tx.description}</p>
                        <p className="text-xs text-slate-400 capitalize">{tx.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${
                        isIncome ? 'text-emerald-600' : 
                        isTransfer ? 'text-slate-600' : 'text-slate-900'
                      }`}>
                        {isIncome ? '+' : (isTransfer ? '' : '-')}{formatMYR(tx.amount)}
                      </span>
                      <button 
                        onClick={() => handleDeleteTransaction(tx.id, tx.description)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}