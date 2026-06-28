import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from './lib/supabaseClient'
import { 
  Wallet, Landmark, PiggyBank, Send, Activity, Clock, 
  TrendingUp, AlertCircle, CheckCircle, 
  RefreshCw, ArrowDownRight, ArrowUpRight,
  Target, Flame, ShieldCheck, AlertTriangle
} from 'lucide-react'

// ============================================
// STEP 1: ACCOUNT DICTIONARY 
// ============================================
const ACCOUNT_DICTIONARY = {
  'maybank': '11111111-1111-1111-1111-111111111111',
  'tng': '22222222-2222-2222-2222-222222222222',
  'gx bank': '33333333-3333-3333-3333-333333333333',
  'gx': '33333333-3333-3333-3333-333333333333',
  'bank rakyat': '44444444-4444-4444-4444-444444444444',
  'hub': '55555555-5555-5555-5555-555555555555',
}

// ============================================
// STEP 2: NLP PARSER
// ============================================
class TransactionParser {
  constructor(accountDict) {
    this.accountDict = accountDict
  }

  findAccountId(name) {
    if (!name) return null
    const normalized = name.toLowerCase().trim()
    if (this.accountDict[normalized]) return this.accountDict[normalized]
    for (const [key, uuid] of Object.entries(this.accountDict)) {
      if (normalized.includes(key) || key.includes(normalized)) return uuid
    }
    return null
  }

  extractAmount(text) {
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
    const categoryMap = {
      food: ['food', 'lunch', 'dinner', 'breakfast', 'meal', 'makan', 'eat'],
      transport: ['lrt', 'mrt', 'grab', 'taxi', 'bus', 'train', 'petrol'],
      entertainment: ['netflix', 'spotify', 'movie', 'game'],
      shopping: ['shop', 'buy', 'purchase', 'mall'],
      utilities: ['electric', 'water', 'internet', 'bill'],
      rent: ['rent', 'housing', 'apartment'],
      transfer: ['transfer', 'move', 'send', 'pindah'],
    }
    const lowerText = text.toLowerCase()
    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) return category
    }
    return 'uncategorized'
  }

  parse(text) {
    const normalizedText = text.trim()
    const result = {
      amount: null, sourceAccountId: null, destinationAccountId: null,
      category: 'uncategorized', description: '', type: 'expense', confidence: 0,
    }

    result.amount = this.extractAmount(normalizedText)
    if (!result.amount) throw new Error('Could not find amount. Please include it (e.g., "RM15")')

    const lowerText = normalizedText.toLowerCase()
    const isTransfer = /(?:move|transfer|send|pindah|from).*?(?:to|into|ke|->)/i.test(lowerText)
    const isIncome = /(?:received|got|income|salary|deposit)/i.test(lowerText)
    const isExpense = /(?:spent|paid|bought|purchase|expense)/i.test(lowerText)

    const fromToMatch = normalizedText.match(/(?:from|dari)\s+([a-zA-Z\s]+?)(?:\s+to\s+|\s+into\s+|\s+->\s+|\s+ke\s+)([a-zA-Z\s]+)/i)
    const atMatch = normalizedText.match(/(?:at|di|pada)\s+([a-zA-Z\s]+?)(?:\s+for\s+|\s+-\s+|\s*$)/i)
    const toMatch = normalizedText.match(/(?:to|into|ke)\s+([a-zA-Z\s]+?)(?:\s+for\s+|\s+-\s+|\s*$)/i)

    if (isTransfer && fromToMatch) {
      result.sourceAccountId = this.findAccountId(fromToMatch[1])
      result.destinationAccountId = this.findAccountId(fromToMatch[2])
      result.type = 'transfer'
    } else if (isExpense && atMatch) {
      result.sourceAccountId = this.findAccountId(atMatch[1])
      result.type = 'expense'
    } else {
      const allAccounts = Object.keys(this.accountDict)
      for (const acc of allAccounts) {
        if (lowerText.includes(acc)) {
          if (isExpense || isTransfer) result.sourceAccountId = this.accountDict[acc]
          else if (isIncome) result.destinationAccountId = this.accountDict[acc]
          break
        }
      }
    }

    if (!result.sourceAccountId && !result.destinationAccountId) {
      throw new Error('Could not identify any account. Please specify account name.')
    }

    result.category = this.extractCategory(normalizedText)
    let description = normalizedText
      .replace(/RM\s*[\d,]+\.?\d*/g, '').replace(/[\d,]+\.?\d*/g, '')
      .replace(/(?:from|to|at|into|for|dari|ke|di|pada)\s+[a-zA-Z\s]+/gi, '').trim()
    
    result.description = description || `${result.type} ${result.amount}`
    return result
  }
}

// ============================================
// CONSTANTS & UTILITIES
// ============================================
const ACCOUNT_ICONS = {
  hub: { icon: Landmark, color: 'text-blue-500', bg: 'bg-blue-50' },
  ewallet: { icon: Wallet, color: 'text-purple-500', bg: 'bg-purple-50' },
  digital_bank: { icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  savings: { icon: PiggyBank, color: 'text-amber-500', bg: 'bg-amber-50' },
}

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function App() {
  const [accounts, setAccounts] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [commitments, setCommitments] = useState([])
  const [gxExpenses, setGxExpenses] = useState([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [omnibarText, setOmnibarText] = useState('')
  const [omnibarStatus, setOmnibarStatus] = useState({ type: '', message: '' })
  
  const parser = useMemo(() => new TransactionParser(ACCOUNT_DICTIONARY), [])
  const statusTimeoutRef = useRef(null)
  
  const DUMMY_USER_ID = '00000000-0000-0000-0000-000000000000'

  // ============================================
  // DATA FETCHING
  // ============================================
  const fetchAllData = useCallback(async () => {
    try {
      // 1. Fetch Balances
      const { data: accData } = await supabase.from('v_account_balances').select('*').order('balance', { ascending: false })
      setAccounts(accData || [])

      // 2. Fetch Recent Transactions
      const { data: txData } = await supabase.from('transactions').select('*').order('transaction_date', { ascending: false }).limit(5)
      setRecentTransactions(txData || [])

      // 3. Fetch Commitments (For Radar)
      const { data: commData } = await supabase.from('commitments').select('*')
      setCommitments(commData || [])

      // 4. Fetch GX Bank Expenses this month (For Velocity)
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const { data: gxData } = await supabase.from('transactions')
        .select('*')
        .eq('source_account_id', ACCOUNT_DICTIONARY['gx bank'])
        .is('destination_account_id', null) // Only external expenses
        .gte('transaction_date', startOfMonth)
      setGxExpenses(gxData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchAllData() }, [fetchAllData])

  // ============================================
  // WRITE DATA
  // ============================================
  const handleOmnibarSubmit = async (e) => {
    e.preventDefault()
    if (!omnibarText.trim()) return
    
    setOmnibarStatus({ type: 'loading', message: 'Processing...' })
    
    try {
      const parsed = parser.parse(omnibarText)
      
      const payload = {
        user_id: DUMMY_USER_ID,
        description: parsed.description,
        amount: Math.abs(parsed.amount), // Fixed negative amount bug
        source_account_id: parsed.sourceAccountId,
        destination_account_id: parsed.destinationAccountId,
        category: parsed.category,
      }

      const { error } = await supabase.from('transactions').insert([payload])
      if (error) throw error
      
      setOmnibarStatus({ type: 'success', message: `✅ Logged: ${parsed.description}` })
      setOmnibarText('')
      fetchAllData() // Refresh everything
      
    } catch (error) {
      setOmnibarStatus({ type: 'error', message: `❌ ${error.message}` })
    }

    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    statusTimeoutRef.current = setTimeout(() => setOmnibarStatus({ type: '', message: '' }), 4000)
  }

  // ============================================
  // PREDICTIVE ENGINE CALCULATIONS
  // ============================================
  
  // 1. Commitment Radar (TNG)
  const radarStats = useMemo(() => {
    const tngAccount = accounts.find(a => a.account_id === ACCOUNT_DICTIONARY['tng'])
    const currentBalance = tngAccount?.balance || 0
    const totalRequired = commitments.reduce((sum, c) => sum + Number(c.amount), 0)
    
    const isSafe = currentBalance >= totalRequired
    const shortfall = isSafe ? 0 : totalRequired - currentBalance

    return { currentBalance, totalRequired, isSafe, shortfall }
  }, [accounts, commitments])

  // 2. Velocity Engine (GX Bank)
  const velocityStats = useMemo(() => {
    const gxAccount = accounts.find(a => a.account_id === ACCOUNT_DICTIONARY['gx bank'])
    const currentBalance = gxAccount?.balance || 0
    
    const totalSpentThisMonth = gxExpenses.reduce((sum, t) => sum + Number(t.amount), 0)
    
    // Time math
    const today = new Date()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const daysPassed = today.getDate()
    const daysRemaining = daysInMonth - daysPassed
    
    // Projections
    const averageDailySpend = daysPassed > 0 ? (totalSpentThisMonth / daysPassed) : 0
    const projectedRunwayDays = averageDailySpend > 0 ? (currentBalance / averageDailySpend) : 999
    
    const isSafe = projectedRunwayDays >= daysRemaining

    return { 
      currentBalance, totalSpentThisMonth, averageDailySpend, 
      projectedRunwayDays: Math.floor(projectedRunwayDays), daysRemaining, isSafe 
    }
  }, [accounts, gxExpenses])

  // ============================================
  // RENDER HELPERS
  // ============================================
  const formatMYR = (amount) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 font-sans text-slate-900 pb-12">
      
      {/* HEADER & OMNIBAR */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg"><Activity className="text-white w-5 h-5" /></div>
            <h1 className="text-xl font-bold tracking-tight">FlowState Finance</h1>
          </div>

          <div className="flex-1 max-w-2xl relative">
            <form onSubmit={handleOmnibarSubmit} className="relative">
              <input
                type="text"
                value={omnibarText}
                onChange={(e) => setOmnibarText(e.target.value)}
                placeholder='Type "spent 15 at GX Bank for lunch" or "moved 500 from Maybank to TNG"'
                className="w-full bg-slate-100 border-2 border-transparent rounded-full py-3 pl-6 pr-12 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all"
                disabled={isLoading}
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full">
                <Send className="w-4 h-4" />
              </button>
            </form>
            {omnibarStatus.message && (
              <div className={`absolute -bottom-6 left-2 text-xs font-medium ${omnibarStatus.type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                {omnibarStatus.message}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* SECTION 1: NODE MAP */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Node Balances
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {accounts.map(acc => {
              const Icon = ACCOUNT_ICONS[acc.classification]?.icon || Wallet
              const color = ACCOUNT_ICONS[acc.classification]?.color || 'text-slate-500'
              const bg = ACCOUNT_ICONS[acc.classification]?.bg || 'bg-slate-50'
              
              return (
                <div key={acc.account_id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex justify-between mb-3">
                    <div className={`p-2 rounded-lg ${bg}`}><Icon className={`${color} w-5 h-5`} /></div>
                  </div>
                  <h3 className="text-slate-500 text-sm font-medium truncate">{acc.account_name}</h3>
                  <p className="text-xl font-bold mt-1 text-slate-900">{formatMYR(acc.balance)}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* SECTION 2: WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* THE PREDICTIVE ENGINE (Replaces Skeleton) */}
          <section className="lg:col-span-2 space-y-6">
            
            {/* Widget 1: Commitment Radar */}
            <div className={`bg-white rounded-2xl shadow-sm border p-6 relative overflow-hidden ${radarStats.isSafe ? 'border-slate-100' : 'border-red-200'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-500" /> TNG Commitment Radar
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Scanning for fixed upcoming deductions.</p>
                </div>
                {radarStats.isSafe ? 
                  <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> SAFE</span> : 
                  <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> TOP UP REQUIRED</span>
                }
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Available Balance</p>
                  <p className="text-lg font-bold">{formatMYR(radarStats.currentBalance)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Required for Bills</p>
                  <p className="text-lg font-bold">{formatMYR(radarStats.totalRequired)}</p>
                </div>
              </div>
            </div>

            {/* Widget 2: Velocity Engine */}
            <div className={`bg-white rounded-2xl shadow-sm border p-6 relative overflow-hidden ${velocityStats.isSafe ? 'border-slate-100' : 'border-amber-200'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" /> GX Bank Burn Rate
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Projecting daily spend survival.</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">Runway: <strong className="text-slate-800">{velocityStats.projectedRunwayDays} Days</strong></span>
                  <span className="text-slate-500">Month Left: <strong className="text-slate-800">{velocityStats.daysRemaining} Days</strong></span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${velocityStats.isSafe ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, (velocityStats.projectedRunwayDays / Math.max(1, velocityStats.daysRemaining)) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <p>Avg Spend: <strong>{formatMYR(velocityStats.averageDailySpend)}/day</strong></p>
                <p>•</p>
                <p>Spent this month: <strong>{formatMYR(velocityStats.totalSpentThisMonth)}</strong></p>
              </div>
            </div>

          </section>

          {/* SECTION 3: RECENT ACTIVITY */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[525px]">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" /> Raw Ledger
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2">
              {recentTransactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${tx.amount < 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                      {tx.amount < 0 ? <ArrowDownRight className="w-4 h-4 text-red-500" /> : <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{tx.description || 'Transaction'}</p>
                      <p className="text-xs text-slate-400">{tx.category || 'Uncategorized'}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${tx.amount < 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                    {formatMYR(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}