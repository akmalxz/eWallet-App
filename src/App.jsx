import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from './lib/supabaseClient'
import { 
  Wallet, Landmark, PiggyBank, Send, Activity, Clock, 
  TrendingUp, AlertCircle, CheckCircle, 
  RefreshCw, XCircle
} from 'lucide-react'

// ============================================
// STEP 1: ACCOUNT DICTIONARY (UUID Mapping)
// ============================================
const ACCOUNT_DICTIONARY = {
  // Account Name Variations → UUID
  'maybank': '11111111-1111-1111-1111-111111111111', // Your actual Maybank UUID
  'may bank': '11111111-1111-1111-1111-111111111111',
  'mbb': '11111111-1111-1111-1111-111111111111',
  
  'tng': '22222222-2222-2222-2222-222222222222',
  'touch n go': '22222222-2222-2222-2222-222222222222',
  'touchngo': '22222222-2222-2222-2222-222222222222',
  
  'gx bank': '33333333-3333-3333-3333-333333333333',
  'gx': '33333333-3333-3333-3333-333333333333',
  
  'bank rakyat': '44444444-4444-4444-4444-444444444444',
  'rakyat': '44444444-4444-4444-4444-444444444444',
  
  'hub': '55555555-5555-5555-5555-555555555555',
  'main': '55555555-5555-5555-5555-555555555555',
}

// ============================================
// STEP 2: NLP PARSER (Regex & Heuristics)
// ============================================
class TransactionParser {
  constructor(accountDict) {
    this.accountDict = accountDict
  }

  // Helper: Find account UUID by name (case-insensitive)
  findAccountId(name) {
    if (!name) return null
    const normalized = name.toLowerCase().trim()
    
    // Direct match
    if (this.accountDict[normalized]) {
      return this.accountDict[normalized]
    }
    
    // Partial match
    for (const [key, uuid] of Object.entries(this.accountDict)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return uuid
      }
    }
    
    return null
  }

  // Helper: Extract amount with currency support
  extractAmount(text) {
    // Match: RM15, 15.50, 15, RM 15, MYR 15
    const patterns = [
      /(?:rm|myr|ringgit)?\s*([\d,]+\.?\d*)\s*(?:rm|myr|ringgit)?/i,
      /([\d,]+\.?\d*)\s*(?:rm|myr|ringgit)/i,
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        // Remove commas and parse
        return parseFloat(match[1].replace(/,/g, ''))
      }
    }
    return null
  }

  // Helper: Extract category from text
  extractCategory(text) {
    const categoryMap = {
      food: ['food', 'lunch', 'dinner', 'breakfast', 'meal', 'makan', 'eat', 'restaurant', 'cafe'],
      transport: ['lrt', 'mrt', 'grab', 'taxi', 'bus', 'train', 'petrol', 'fuel', 'parking', 'toll'],
      entertainment: ['netflix', 'spotify', 'movie', 'game', 'subscription', 'entertainment'],
      shopping: ['shop', 'buy', 'purchase', 'mall', 'clothing', 'shoes'],
      utilities: ['electric', 'water', 'internet', 'wifi', 'phone', 'bill', 'utility'],
      rent: ['rent', 'housing', 'apartment', 'house'],
      savings: ['save', 'saving', 'deposit', 'investment', 'invest'],
      salary: ['salary', 'paycheck', 'pay', 'income', 'gaji'],
      transfer: ['transfer', 'move', 'send', 'pindah'],
      expense: ['spent', 'paid', 'expense', 'cost'],
    }

    const lowerText = text.toLowerCase()
    
    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category
      }
    }
    
    return 'uncategorized'
  }

  // Main parse function
  parse(text) {
    const normalizedText = text.trim()
    const result = {
      amount: null,
      sourceAccountId: null,
      destinationAccountId: null,
      category: 'uncategorized',
      description: '',
      type: 'expense', // 'expense', 'transfer', 'income'
      confidence: 0, // For future ML improvements
    }

    // 1. Extract amount
    result.amount = this.extractAmount(normalizedText)
    if (!result.amount) {
      throw new Error('Could not find amount. Please include the amount (e.g., "15", "RM15")')
    }

    // 2. Detect transaction type
    const lowerText = normalizedText.toLowerCase()
    
    // Check for transfer patterns
    const transferPattern = /(?:move|transfer|send|pindah|from).*?(?:to|into|ke|->)/i
    const isTransfer = transferPattern.test(lowerText)
    
    // Check for income patterns
    const incomePattern = /(?:received|got|income|salary|paycheck|deposit|inflow)/i
    const isIncome = incomePattern.test(lowerText)
    
    // Check for expense patterns
    const expensePattern = /(?:spent|paid|bought|purchase|expense|withdraw|outflow)/i
    const isExpense = expensePattern.test(lowerText)

    // 3. Extract account names
    // Try to find "from X to Y" pattern
    const fromToMatch = normalizedText.match(/(?:from|dari)\s+([a-zA-Z\s]+?)(?:\s+to\s+|\s+into\s+|\s+->\s+|\s+ke\s+)([a-zA-Z\s]+)/i)
    
    // Try to find "at X" pattern (for expenses)
    const atMatch = normalizedText.match(/(?:at|di|pada)\s+([a-zA-Z\s]+?)(?:\s+for\s+|\s+-\s+|\s*$)/i)
    
    // Try to find "to X" pattern (for transfers)
    const toMatch = normalizedText.match(/(?:to|into|ke)\s+([a-zA-Z\s]+?)(?:\s+for\s+|\s+-\s+|\s*$)/i)
    
    // Try to find "from X" pattern
    const fromMatch = normalizedText.match(/(?:from|dari)\s+([a-zA-Z\s]+?)(?:\s+to\s+|\s+for\s+|\s*$)/i)

    // 4. Determine source and destination accounts
    if (isTransfer && fromToMatch) {
      // Transfer: "from Maybank to TNG"
      const sourceName = fromToMatch[1].trim()
      const destName = fromToMatch[2].trim()
      
      result.sourceAccountId = this.findAccountId(sourceName)
      result.destinationAccountId = this.findAccountId(destName)
      result.type = 'transfer'
      
      if (!result.sourceAccountId || !result.destinationAccountId) {
        throw new Error(`Could not identify accounts. Found: from "${sourceName}" to "${destName}"`)
      }
      
    } else if (isTransfer && fromMatch && toMatch) {
      // Alternative: "transfer from Maybank to TNG"
      const sourceName = fromMatch[1].trim()
      const destName = toMatch[1].trim()
      
      result.sourceAccountId = this.findAccountId(sourceName)
      result.destinationAccountId = this.findAccountId(destName)
      result.type = 'transfer'
      
      if (!result.sourceAccountId || !result.destinationAccountId) {
        throw new Error(`Could not identify accounts. Found: from "${sourceName}" to "${destName}"`)
      }
      
    } else if (isExpense && atMatch) {
      // Expense: "spent 15 at GX Bank for food"
      const accountName = atMatch[1].trim()
      result.sourceAccountId = this.findAccountId(accountName)
      result.destinationAccountId = null // Outgoing only
      result.type = 'expense'
      
      if (!result.sourceAccountId) {
        throw new Error(`Could not identify account "${accountName}"`)
      }
      
    } else if (isExpense && toMatch) {
      // Alternative expense: "paid 15 to Grab"
      const accountName = toMatch[1].trim()
      result.sourceAccountId = this.findAccountId(accountName)
      result.destinationAccountId = null
      result.type = 'expense'
      
      if (!result.sourceAccountId) {
        throw new Error(`Could not identify account "${accountName}"`)
      }
      
    } else if (isIncome && toMatch) {
      // Income: "received 5000 into Maybank"
      const accountName = toMatch[1].trim()
      result.destinationAccountId = this.findAccountId(accountName)
      result.sourceAccountId = null // Incoming only
      result.type = 'income'
      
      if (!result.destinationAccountId) {
        throw new Error(`Could not identify account "${accountName}"`)
      }
      
    } else {
      // Default: Try to find any account mention
      const allAccounts = Object.keys(this.accountDict)
      for (const accountName of allAccounts) {
        if (lowerText.includes(accountName)) {
          const accountId = this.accountDict[accountName]
          
          if (isExpense || isTransfer) {
            result.sourceAccountId = accountId
          } else if (isIncome) {
            result.destinationAccountId = accountId
          }
          break
        }
      }
      
      // If still no account found, throw error
      if (!result.sourceAccountId && !result.destinationAccountId) {
        throw new Error('Could not identify any account. Please specify account name (e.g., "GX Bank", "TNG")')
      }
    }

    // 5. Extract category
    result.category = this.extractCategory(normalizedText)

    // 6. Generate description
    // Remove amount and account names to create clean description
    let description = normalizedText
      .replace(/RM\s*[\d,]+\.?\d*/g, '')
      .replace(/[\d,]+\.?\d*/g, '')
      .replace(/(?:from|to|at|into|for|dari|ke|di|pada)\s+[a-zA-Z\s]+/gi, '')
      .trim()
    
    // If description is empty, generate one
    if (!description) {
      const action = result.type === 'income' ? 'Received' : 
                    result.type === 'transfer' ? 'Transferred' : 'Spent'
      description = `${action} ${result.amount}`
    }
    
    result.description = description

    // 7. Calculate confidence (heuristic-based)
    let confidence = 70 // Base confidence
    
    if (result.sourceAccountId && result.destinationAccountId) confidence += 10
    if (result.amount > 0) confidence += 10
    if (result.category !== 'uncategorized') confidence += 5
    if (result.description.length > 5) confidence += 5
    
    result.confidence = Math.min(confidence, 100)

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

const CLASSIFICATION_LABELS = {
  hub: 'Hub',
  ewallet: 'E-Wallet',
  digital_bank: 'Digital Bank',
  savings: 'Savings',
}

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function App() {
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [omnibarText, setOmnibarText] = useState('')
  const [omnibarStatus, setOmnibarStatus] = useState({ type: '', message: '' })
  const [error, setError] = useState(null)
  const [parsedTransaction, setParsedTransaction] = useState(null)
  const [recentTransactions, setRecentTransactions] = useState([])
  
  const parser = useMemo(() => new TransactionParser(ACCOUNT_DICTIONARY), [])
  const statusTimeoutRef = useRef(null)

  // ============================================
  // STEP 3: SUPABASE INSERT PAYLOAD
  // ============================================
  const insertTransaction = useCallback(async (parsedData) => {
    // Build the transaction payload
    const payload = {
      description: parsedData.description,
      amount: parsedData.type === 'expense' ? -Math.abs(parsedData.amount) : parsedData.amount,
      source_account_id: parsedData.sourceAccountId,
      destination_account_id: parsedData.destinationAccountId,
      category: parsedData.category,
      transaction_date: new Date().toISOString(),
      metadata: {
        raw_text: omnibarText,
        confidence: parsedData.confidence,
        parsed_type: parsedData.type,
      }
    }

    // Validate payload
    if (payload.source_account_id === null && payload.destination_account_id === null) {
      throw new Error('No accounts specified for transaction')
    }

    // For expenses, ensure source is set
    if (parsedData.type === 'expense' && !payload.source_account_id) {
      throw new Error('Expense requires a source account')
    }

    // For income, ensure destination is set
    if (parsedData.type === 'income' && !payload.destination_account_id) {
      throw new Error('Income requires a destination account')
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('transactions')
      .insert([payload])
      .select()

    if (error) throw error
    
    return data[0]
  }, [omnibarText])

  // ============================================
  // FETCH DATA FUNCTIONS
  // ============================================
  const fetchBalances = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    setError(null)
    
    try {
      const { data, error: fetchError } = await supabase
        .from('v_account_balances')
        .select('*')
        .order('balance', { ascending: false })

      if (fetchError) throw fetchError
      
      const sanitizedData = data?.map(account => ({
        ...account,
        balance: Math.max(0, Number(account.balance) || 0)
      })) || []
      
      setAccounts(sanitizedData)
    } catch (error) {
      console.error('Error fetching balances:', error.message)
      setError('Failed to load balances. Please try again.')
    } finally {
      setIsLoading(false)
      if (showRefresh) setIsRefreshing(false)
    }
  }, [])

  const fetchRecentTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(5)

      if (error) throw error
      setRecentTransactions(data || [])
    } catch (error) {
      console.error('Error fetching recent transactions:', error.message)
    }
  }, [])

  // ============================================
  // STEP 4: REACTIVE UI UPDATE
  // ============================================
  const processOmnibarSubmission = useCallback(async (text) => {
    try {
      // Parse the text
      const parsed = parser.parse(text)
      setParsedTransaction(parsed)
      
      // Insert into database
      const transaction = await insertTransaction(parsed)
      
      // Success feedback
      setOmnibarStatus({
        type: 'success',
        message: `✅ ${parsed.type}: ${parsed.description} (RM${parsed.amount})`
      })
      
      // Clear input
      setOmnibarText('')
      
      // STEP 4: REFRESH UI DATA
      await Promise.all([
        fetchBalances(true), // Refresh balances
        fetchRecentTransactions() // Refresh recent transactions
      ])
      
      // Clear status after delay
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
      }
      statusTimeoutRef.current = setTimeout(() => {
        setOmnibarStatus({ type: '', message: '' })
        setParsedTransaction(null)
      }, 5000)
      
    } catch (error) {
      // Error feedback
      setOmnibarStatus({
        type: 'error',
        message: `❌ ${error.message}`
      })
      
      // Clear error after delay
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
      }
      statusTimeoutRef.current = setTimeout(() => {
        setOmnibarStatus({ type: '', message: '' })
      }, 6000)
      
      throw error
    }
  }, [parser, insertTransaction, fetchBalances, fetchRecentTransactions])

  // ============================================
  // HANDLERS
  // ============================================
  const handleOmnibarSubmit = useCallback(async (e) => {
    e.preventDefault()
    const trimmedText = omnibarText.trim()
    
    if (!trimmedText) {
      setOmnibarStatus({ 
        type: 'error', 
        message: 'Please enter a transaction description.' 
      })
      setTimeout(() => setOmnibarStatus({ type: '', message: '' }), 3000)
      return
    }

    setOmnibarStatus({ type: 'loading', message: '⏳ Processing transaction...' })
    
    try {
      await processOmnibarSubmission(trimmedText)
    } catch (error) {
      // Error already handled in processOmnibarSubmission
    }
  }, [omnibarText, processOmnibarSubmission])

  const handleRefresh = useCallback(() => {
    Promise.all([
      fetchBalances(true),
      fetchRecentTransactions()
    ])
  }, [fetchBalances, fetchRecentTransactions])

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    fetchBalances()
    fetchRecentTransactions()
    
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
      }
    }
  }, [fetchBalances, fetchRecentTransactions])

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  const formatMYR = useCallback((amount) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }, [])

  const getAccountIcon = useCallback((classification) => {
    const config = ACCOUNT_ICONS[classification]
    if (!config) return <Wallet className="text-slate-400 w-6 h-6" />
    
    const IconComponent = config.icon
    return <IconComponent className={`${config.color} w-6 h-6`} />
  }, [])

  const getAccountBgColor = useCallback((classification) => {
    return ACCOUNT_ICONS[classification]?.bg || 'bg-slate-50'
  }, [])

  // ============================================
  // TOTAL BALANCE
  // ============================================
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.balance, 0)
  }, [accounts])

  // ============================================
  // RENDER HELPERS
  // ============================================
  const renderOmnibarStatus = () => {
    if (!omnibarStatus.message) return null
    
    const styles = {
      loading: 'text-blue-500',
      success: 'text-emerald-500',
      error: 'text-red-500'
    }
    
    const icons = {
      loading: <RefreshCw className="w-4 h-4 animate-spin" />,
      success: <CheckCircle className="w-4 h-4" />,
      error: <AlertCircle className="w-4 h-4" />
    }
    
    return (
      <div className={`absolute -bottom-7 left-0 flex items-center gap-1.5 text-xs whitespace-nowrap ${styles[omnibarStatus.type] || 'text-slate-500'}`}>
        {icons[omnibarStatus.type]}
        <span>{omnibarStatus.message}</span>
      </div>
    )
  }

  const renderAccountCard = (account) => {
    const bgColor = getAccountBgColor(account.classification)
    const isLowBalance = account.balance < 100
    
    return (
      <div 
        key={account.account_id} 
        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200 group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg ${bgColor}`}>
            {getAccountIcon(account.classification)}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
            {CLASSIFICATION_LABELS[account.classification] || account.classification}
          </span>
        </div>
        
        <h3 className="text-slate-500 text-sm font-medium truncate" title={account.account_name}>
          {account.account_name}
        </h3>
        
        <div className="flex items-end justify-between mt-1">
          <p className={`text-2xl font-bold ${isLowBalance ? 'text-amber-500' : 'text-slate-900'}`}>
            {formatMYR(account.balance)}
          </p>
          {isLowBalance && (
            <span className="text-[10px] font-medium text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
              Low
            </span>
          )}
        </div>
      </div>
    )
  }

  const renderRecentTransaction = (tx) => {
    const isOutgoing = tx.amount < 0
    const isTransfer = tx.source_account_id && tx.destination_account_id
    
    return (
      <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-1.5 rounded-full ${isOutgoing ? 'bg-red-50' : 'bg-emerald-50'}`}>
            {isOutgoing ? 
              <ArrowDownRight className="w-3 h-3 text-red-500" /> :
              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{tx.description || 'Transaction'}</p>
            <span className="text-xs text-slate-400">{tx.category || 'Uncategorized'}</span>
          </div>
        </div>
        <span className={`text-sm font-semibold ${isOutgoing ? 'text-red-500' : 'text-emerald-500'}`}>
          {formatMYR(tx.amount)}
        </span>
      </div>
    )
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 font-sans text-slate-900">
      
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-2 rounded-lg shadow-sm">
              <Activity className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">FlowState Finance</h1>
              {!isLoading && accounts.length > 0 && (
                <p className="text-xs text-slate-400 font-medium">
                  Total: {formatMYR(totalBalance)}
                </p>
              )}
            </div>
          </div>

          {/* OMNIBAR */}
          <div className="flex-1 max-w-2xl relative">
            <form onSubmit={handleOmnibarSubmit} className="relative">
              <input
                type="text"
                value={omnibarText}
                onChange={(e) => setOmnibarText(e.target.value)}
                placeholder='Type "spent 15 at GX Bank for lunch" or "moved 500 from Maybank to TNG"'
                className={`w-full bg-slate-100 border-2 border-transparent rounded-full py-3 pl-6 pr-12 text-sm 
                  focus:border-blue-500 focus:bg-white outline-none transition-all duration-200
                  ${omnibarStatus.type === 'error' ? 'border-red-300 bg-red-50' : ''}
                  ${omnibarStatus.type === 'success' ? 'border-emerald-300 bg-emerald-50' : ''}`}
                disabled={omnibarStatus.type === 'loading'}
                autoComplete="off"
              />
              <button 
                type="submit" 
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-blue-500 to-blue-600 
                  hover:from-blue-600 hover:to-blue-700 text-white rounded-full transition-all duration-200 
                  disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                disabled={omnibarStatus.type === 'loading' || !omnibarText.trim()}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            {renderOmnibarStatus()}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* SECTION 1: NODE MAP */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Node Balances
            </h2>
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={() => fetchBalances()}
                className="mt-3 text-xs font-medium text-red-600 hover:text-red-700 underline"
              >
                Try again
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="text-xs text-slate-400">Loading balances...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {accounts.map(renderAccountCard)}
            </div>
          )}
        </section>

        {/* SECTION 2: WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Analytics Widget */}
          <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[300px]">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" /> Analytics
            </h2>
            
            <div className="flex flex-col items-center justify-center h-[220px] text-slate-400">
              <Activity className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm font-medium">Burn Rate & Velocity Metrics</p>
              <p className="text-xs">Coming soon: Predictive analytics</p>
              
              <div className="w-full max-w-md mt-4 grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-slate-50 rounded-lg p-3 animate-pulse">
                    <div className="h-3 bg-slate-200 rounded w-2/3 mx-auto"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto mt-2"></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> Recent Activity
              </h2>
              <span className="text-[10px] font-medium text-slate-400">Last 5</span>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-sm">No recent transactions</p>
                  <p className="text-xs mt-1">Try adding one above!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentTransactions.map(renderRecentTransaction)}
                </div>
              )}
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 pb-6 text-center">
        <p className="text-xs text-slate-400">
          FlowState Finance v0.3 • {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}