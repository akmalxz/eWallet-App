import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from './lib/supabaseClient'
import { 
  Wallet, Landmark, PiggyBank, Send, Activity, Clock, 
  TrendingUp, AlertCircle, CheckCircle, 
  ArrowDownRight, ArrowUpRight, Target, Flame, ShieldCheck, 
  AlertTriangle, LogOut, Plus, Settings, X, Trash2, Tag, Database
} from 'lucide-react'

import Auth from './components/Auth'

// ============================================
// ICON DICTIONARY (For dynamic classifications)
// ============================================
const ICON_MAP = {
  Landmark: Landmark,
  Wallet: Wallet,
  Activity: Activity,
  PiggyBank: PiggyBank,
  Database: Database
}

// ============================================
// DYNAMIC NLP PARSER
// ============================================
class TransactionParser {
  constructor(accountDict, categoryDict) { 
    this.accountDict = accountDict 
    this.categoryDict = categoryDict || {}
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
    const patterns = [ /(?:rm|myr|ringgit)?\s*([\d,]+\.?\d*)\s*(?:rm|myr|ringgit)?/i, /([\d,]+\.?\d*)\s*(?:rm|myr|ringgit)/i ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return parseFloat(match[1].replace(/,/g, ''))
    }
    return null
  }
  
  extractCategory(text) {
    if (Object.keys(this.categoryDict).length === 0) return 'uncategorized'
    const lowerText = text.toLowerCase()
    
    // Check against dynamic dictionary keywords
    for (const [categoryName, keywords] of Object.entries(this.categoryDict)) {
      if (keywords && keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        return categoryName
      }
      // Fallback: check if the category name itself is in the text
      if (lowerText.includes(categoryName.toLowerCase())) return categoryName
    }
    return 'uncategorized'
  }
  
  parse(text) {
    const normalizedText = text.trim()
    const result = { amount: null, sourceAccountId: null, destinationAccountId: null, category: 'uncategorized', description: '', type: 'expense' }
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
    if (!result.sourceAccountId && !result.destinationAccountId) throw new Error('Could not identify any account.')
    
    result.category = this.extractCategory(normalizedText)
    result.description = normalizedText.replace(/RM\s*[\d,]+\.?\d*/g, '').replace(/[\d,]+\.?\d*/g, '').replace(/(?:from|to|at|into|for|dari|ke|di|pada)\s+[a-zA-Z\s]+/gi, '').trim() || `${result.type} ${result.amount}`
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
  
  // New State for Dynamic DB Data
  const [categories, setCategories] = useState([])
  const [classifications, setClassifications] = useState([])
  
  const [isLoading, setIsLoading] = useState(true)
  
  // Modals & Forms State
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [omnibarText, setOmnibarText] = useState('')
  const [omnibarStatus, setOmnibarStatus] = useState({ type: '', message: '' })
  
  const statusTimeoutRef = useRef(null)

  // 1. Compile Account Dictionary
  const dynamicAccountDict = useMemo(() => {
    const dict = {}
    accounts.forEach(acc => {
      const name = acc.account_name.toLowerCase()
      dict[name] = acc.id // Fixed from account_id to match your schema
      if (acc.classification === 'ewallet' && name.includes('tng')) dict['tng'] = acc.id
      if (acc.classification === 'digital_bank' && name.includes('gx')) dict['gx'] = acc.id
      if (acc.classification === 'hub' && name.includes('maybank')) dict['mbb'] = acc.id
      dict[acc.classification] = acc.id
    })
    return dict
  }, [accounts])

  // 2. Compile Category Dictionary for NLP
  const dynamicCategoryDict = useMemo(() => {
    const dict = {}
    categories.forEach(cat => {
      dict[cat.name.toLowerCase()] = cat.keywords || [cat.name.toLowerCase()]
    })
    return dict
  }, [categories])

  const parser = useMemo(() => new TransactionParser(dynamicAccountDict, dynamicCategoryDict), [dynamicAccountDict, dynamicCategoryDict])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); setIsAuthenticated(true) }
      setIsAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((async (_event, session) => {
      if (session?.user) { 
        setUser(session.user)
        setIsAuthenticated(true) 
      }
      else { setUser(null); setIsAuthenticated(false); setAccounts([]) }
    }))
    return () => subscription.unsubscribe()
  }, [])

  const fetchAllData = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      // Fetch Accounts
      const { data: accData } = await supabase.from('v_account_balances').select('*').order('balance', { ascending: false })
      setAccounts(accData || [])

      // Fetch Categories
      const { data: catData } = await supabase.from('categories').select('*').order('name')
      // Seed default categories if none exist for new user
      if (!catData || catData.length === 0) {
        const defaultCats = [
          { user_id: user.id, name: 'Food', keywords: ['food', 'lunch', 'dinner', 'breakfast', 'makan', 'eat'] },
          { user_id: user.id, name: 'Transport', keywords: ['lrt', 'mrt', 'grab', 'taxi', 'petrol', 'toll'] },
          { user_id: user.id, name: 'Income', keywords: ['salary', 'bonus', 'pay'] }
        ]
        await supabase.from('categories').insert(defaultCats)
        const { data: refreshedCats } = await supabase.from('categories').select('*').order('name')
        setCategories(refreshedCats || [])
      } else {
        setCategories(catData)
      }

      // Fetch Classifications
      const { data: classData } = await supabase.from('classifications').select('*')
      if (!classData || classData.length === 0) {
        const defaultClass = [
          { user_id: user.id, key_name: 'hub', label: 'Main Hub', icon_name: 'Landmark', color_class: 'text-blue-500', bg_class: 'bg-blue-50' },
          { user_id: user.id, key_name: 'ewallet', label: 'Daily eWallet', icon_name: 'Wallet', color_class: 'text-purple-500', bg_class: 'bg-purple-50' },
          { user_id: user.id, key_name: 'digital_bank', label: 'Digital Bank', icon_name: 'Activity', color_class: 'text-emerald-500', bg_class: 'bg-emerald-50' },
        ]
        await supabase.from('classifications').insert(defaultClass)
        const { data: refreshedClass } = await supabase.from('classifications').select('*')
        setClassifications(refreshedClass || [])
      } else {
        setClassifications(classData)
      }

      // Fetch Transactions
      const { data: txData } = await supabase.from('transactions').select('*').order('transaction_date', { ascending: false }).limit(20)
      setRecentTransactions(txData || [])

      const { data: commData } = await supabase.from('commitments').select('*')
      setCommitments(commData || [])

      const digitalBankId = accData?.find(a => a.classification === 'digital_bank')?.id
      if (digitalBankId) {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        const { data: gxData } = await supabase.from('transactions')
          .select('*').eq('source_account_id', digitalBankId).is('destination_account_id', null).gte('transaction_date', startOfMonth)
        setGxExpenses(gxData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => { if (isAuthenticated) fetchAllData() }, [isAuthenticated, fetchAllData])

  const handleOmnibarSubmit = async (e) => {
    e.preventDefault()
    if (!omnibarText.trim() || !user) return
    setOmnibarStatus({ type: 'loading', message: 'Processing...' })
    try {
      const parsed = parser.parse(omnibarText)
      const payload = {
        user_id: user.id, description: parsed.description, amount: Math.abs(parsed.amount),
        source_account_id: parsed.sourceAccountId, destination_account_id: parsed.destinationAccountId, category: parsed.category,
      }
      const { error } = await supabase.from('transactions').insert([payload])
      if (error) throw error
      setOmnibarStatus({ type: 'success', message: `✅ Logged: ${parsed.description}` })
      setOmnibarText('')
      fetchAllData() 
    } catch (error) {
      setOmnibarStatus({ type: 'error', message: `❌ ${error.message}` })
    }
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    statusTimeoutRef.current = setTimeout(() => setOmnibarStatus({ type: '', message: '' }), 4000)
  }

  // ============================================
  // MANUAL TRANSACTION LOGGING COMPONENT
  // ============================================
  const ManualTransactionModal = () => {
    const [txType, setTxType] = useState('expense') 
    const [amount, setAmount] = useState('')
    const [desc, setDesc] = useState('')
    const [category, setCategory] = useState(categories[0]?.name || 'uncategorized')
    const [source, setSource] = useState(accounts[0]?.id || '')
    const [dest, setDest] = useState(accounts[0]?.id || '')
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e) => {
      e.preventDefault()
      setSaving(true)
      try {
        const payload = {
          user_id: user.id, description: desc || 'Manual Entry', amount: Math.abs(parseFloat(amount)), category,
          source_account_id: txType === 'income' ? null : source,
          destination_account_id: txType === 'expense' ? null : (txType === 'income' ? source : dest)
        }
        const { error } = await supabase.from('transactions').insert([payload])
        if (error) throw error
        setIsTransactionModalOpen(false)
        fetchAllData()
      } catch (error) {
        alert('Error saving transaction: ' + error.message)
      } finally {
        setSaving(false)
      }
    }

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Log Transaction</h2>
            <button onClick={() => setIsTransactionModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
          </div>
          
          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
            {['expense', 'income', 'transfer'].map(t => (
              <button key={t} onClick={() => setTxType(t)} className={`flex-1 py-2 text-sm font-medium capitalize rounded-lg transition-all ${txType === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
                {t}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-50 border rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 border rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="uncategorized">Uncategorized</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
              <input type="text" required value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full bg-slate-50 border rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Salary, Lunch at Nasi Kandar" />
            </div>

            {txType !== 'transfer' ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{txType === 'income' ? 'Deposit To' : 'Pay From'}</label>
                <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-slate-50 border rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">From</label>
                  <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-slate-50 border rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500">
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">To</label>
                  <select value={dest} onChange={(e) => setDest(e.target.value)} className="w-full bg-slate-50 border rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500">
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                  </select>
                </div>
              </div>
            )}

            <button type="submit" disabled={saving} className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl mt-4">
              {saving ? 'Saving...' : 'Log Transaction'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ============================================
  // NODE & CATEGORY MANAGER COMPONENT
  // ============================================
  const SettingsModal = () => {
    const [activeTab, setActiveTab] = useState('nodes') // nodes or categories
    
    // Bank State
    const [newBankName, setNewBankName] = useState('')
    const [newBankClass, setNewBankClass] = useState(classifications[0]?.key_name || 'hub')
    
    // Category State
    const [newCategoryName, setNewCategoryName] = useState('')
    const [newCategoryKeywords, setNewCategoryKeywords] = useState('')
    
    const [saving, setSaving] = useState(false)

    const handleAddBank = async (e) => {
      e.preventDefault()
      setSaving(true)
      try {
        const { error } = await supabase.from('accounts').insert([{ user_id: user.id, account_name: newBankName, classification: newBankClass }])
        if (error) throw error
        setNewBankName('')
        fetchAllData()
      } catch (error) { alert('Error adding bank: ' + error.message) } finally { setSaving(false) }
    }

    const handleDeleteBank = async (id, name) => {
      if (!window.confirm(`Are you sure you want to delete ${name}?`)) return
      try {
        const { error } = await supabase.from('accounts').delete().eq('id', id)
        if (error) throw error
        fetchAllData()
      } catch (error) { alert('Cannot delete this node because it has transactions.') }
    }

    const handleAddCategory = async (e) => {
      e.preventDefault()
      setSaving(true)
      try {
        const keywordArray = newCategoryKeywords.split(',').map(k => k.trim()).filter(k => k)
        const { error } = await supabase.from('categories').insert([{ user_id: user.id, name: newCategoryName, keywords: keywordArray }])
        if (error) throw error
        setNewCategoryName(''); setNewCategoryKeywords('')
        fetchAllData()
      } catch (error) { alert('Error adding category: ' + error.message) } finally { setSaving(false) }
    }

    const handleDeleteCategory = async (id, name) => {
      if (!window.confirm(`Delete category ${name}?`)) return
      try {
        const { error } = await supabase.from('categories').delete().eq('id', id)
        if (error) throw error
        fetchAllData()
      } catch (error) { alert('Error deleting category.') }
    }

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Vault Settings</h2>
            <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
          </div>

          <div className="flex gap-4 mb-6 border-b border-slate-100 pb-2">
            <button onClick={() => setActiveTab('nodes')} className={`text-sm font-bold pb-2 ${activeTab === 'nodes' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Nodes</button>
            <button onClick={() => setActiveTab('categories')} className={`text-sm font-bold pb-2 ${activeTab === 'categories' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Categories</button>
          </div>

          {activeTab === 'nodes' ? (
            <div>
              <div className="space-y-3 mb-6">
                {accounts.map(acc => (
                  <div key={acc.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{acc.account_name}</p>
                      <p className="text-xs text-slate-400 capitalize">{acc.classification}</p>
                    </div>
                    <button onClick={() => handleDeleteBank(acc.id, acc.account_name)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddBank} className="border-t pt-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Add New Node</h3>
                <input type="text" required value={newBankName} onChange={(e) => setNewBankName(e.target.value)} className="w-full bg-slate-50 border rounded-xl py-2 px-3 text-sm" placeholder="Bank Name (e.g. CIMB)" />
                <select value={newBankClass} onChange={(e) => setNewBankClass(e.target.value)} className="w-full bg-slate-50 border rounded-xl py-2 px-3 text-sm">
                  {classifications.map(c => <option key={c.id} value={c.key_name}>{c.label}</option>)}
                </select>
                <button type="submit" disabled={saving || !newBankName} className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl text-sm">Add Node</button>
              </form>
            </div>
          ) : (
            <div>
              <div className="space-y-3 mb-6">
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{cat.name}</p>
                      <p className="text-xs text-slate-400">Keywords: {cat.keywords?.join(', ')}</p>
                    </div>
                    <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddCategory} className="border-t pt-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Add New Category</h3>
                <input type="text" required value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="w-full bg-slate-50 border rounded-xl py-2 px-3 text-sm" placeholder="Category Name (e.g. Pets)" />
                <input type="text" value={newCategoryKeywords} onChange={(e) => setNewCategoryKeywords(e.target.value)} className="w-full bg-slate-50 border rounded-xl py-2 px-3 text-sm" placeholder="Keywords (comma separated: dog, vet, food)" />
                <button type="submit" disabled={saving || !newCategoryName} className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl text-sm">Add Category</button>
              </form>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================
  // PREDICTIVE ENGINE
  // ============================================
  const radarStats = useMemo(() => {
    const ewalletAccount = accounts.find(a => a.classification === 'ewallet')
    const currentBalance = ewalletAccount?.balance || 0
    const totalRequired = commitments.reduce((sum, c) => sum + Number(c.amount), 0)
    const isSafe = currentBalance >= totalRequired
    return { currentBalance, totalRequired, isSafe, shortfall: isSafe ? 0 : totalRequired - currentBalance, name: ewalletAccount?.account_name || 'eWallet' }
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
      currentBalance, totalSpentThisMonth, averageDailySpend, 
      projectedRunwayDays: Math.floor(projectedRunwayDays), daysRemaining, isSafe: projectedRunwayDays >= daysRemaining,
      name: digitalAccount?.account_name || 'Digital Bank'
    }
  }, [accounts, gxExpenses])

  const formatMYR = (amount) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(amount)

  if (isAuthLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading secure vault...</div>
  if (!isAuthenticated) return <Auth />

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 font-sans text-slate-900 pb-12">
      
      {isTransactionModalOpen && <ManualTransactionModal />}
      {isSettingsModalOpen && <SettingsModal />}

      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-2 rounded-lg"><Activity className="text-white w-5 h-5" /></div>
              <h1 className="text-xl font-bold tracking-tight">FlowState</h1>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <button onClick={() => setIsTransactionModalOpen(true)} className="p-2 bg-blue-500 text-white rounded-lg"><Plus className="w-4 h-4" /></button>
              <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 bg-slate-100 text-slate-600 rounded-lg"><Settings className="w-4 h-4" /></button>
              <button onClick={() => supabase.auth.signOut()} className="p-2 text-red-400"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex-1 max-w-2xl relative flex gap-3">
            <form onSubmit={handleOmnibarSubmit} className="relative flex-1">
              <input type="text" value={omnibarText} onChange={(e) => setOmnibarText(e.target.value)} placeholder='Type "spent 15 at GX Bank"' className="w-full bg-slate-100 border-2 border-transparent rounded-full py-2.5 pl-5 pr-12 text-sm focus:border-blue-500 focus:bg-white outline-none" disabled={isLoading} />
              <button type="submit" disabled={isLoading} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full"><Send className="w-4 h-4" /></button>
            </form>
            <div className="hidden md:flex items-center gap-2 border-l border-slate-200 pl-4">
              <button onClick={() => setIsTransactionModalOpen(true)} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-full transition-colors"><Plus className="w-4 h-4" /> Log Data</button>
              <button onClick={() => setIsSettingsModalOpen(true)} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"><Settings className="w-4 h-4" /></button>
              <button onClick={() => supabase.auth.signOut()} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut className="w-4 h-4" /></button>
            </div>
            {omnibarStatus.message && <div className={`absolute -bottom-6 left-2 text-xs font-medium ${omnibarStatus.type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>{omnibarStatus.message}</div>}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Wallet className="w-4 h-4" /> Node Balances</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {accounts.map(acc => {
              const classData = classifications.find(c => c.key_name === acc.classification)
              const Icon = classData && ICON_MAP[classData.icon_name] ? ICON_MAP[classData.icon_name] : Wallet
              const color = classData?.color_class || 'text-slate-500'
              const bg = classData?.bg_class || 'bg-slate-50'
              
              return (
                <div key={acc.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex justify-between mb-3"><div className={`p-2 rounded-lg ${bg}`}><Icon className={`${color} w-5 h-5`} /></div></div>
                  <h3 className="text-slate-500 text-sm font-medium truncate">{acc.account_name}</h3>
                  <p className="text-xl font-bold mt-1 text-slate-900">{formatMYR(acc.balance)}</p>
                </div>
              )
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-6">
            <div className={`bg-white rounded-2xl shadow-sm border p-6 relative overflow-hidden ${radarStats.isSafe ? 'border-slate-100' : 'border-red-200'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Target className="w-4 h-4 text-purple-500" /> {radarStats.name} Radar</h2>
                  <p className="text-xs text-slate-500 mt-1">Scanning for fixed upcoming deductions.</p>
                </div>
                {radarStats.isSafe ? <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> SAFE</span> : <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> TOP UP REQUIRED</span>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><p className="text-xs text-slate-500 mb-1">Available Balance</p><p className="text-lg font-bold">{formatMYR(radarStats.currentBalance)}</p></div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><p className="text-xs text-slate-500 mb-1">Required for Bills</p><p className="text-lg font-bold">{formatMYR(radarStats.totalRequired)}</p></div>
              </div>
            </div>

            <div className={`bg-white rounded-2xl shadow-sm border p-6 relative overflow-hidden ${velocityStats.isSafe ? 'border-slate-100' : 'border-amber-200'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> {velocityStats.name} Burn Rate</h2>
                  <p className="text-xs text-slate-500 mt-1">Projecting daily spend survival.</p>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2"><span className="text-slate-500">Runway: <strong className="text-slate-800">{velocityStats.projectedRunwayDays} Days</strong></span><span className="text-slate-500">Month Left: <strong className="text-slate-800">{velocityStats.daysRemaining} Days</strong></span></div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${velocityStats.isSafe ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (velocityStats.projectedRunwayDays / Math.max(1, velocityStats.daysRemaining)) * 100)}%` }}></div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500"><p>Avg Spend: <strong>{formatMYR(velocityStats.averageDailySpend)}/day</strong></p><p>•</p><p>Spent this month: <strong>{formatMYR(velocityStats.totalSpentThisMonth)}</strong></p></div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[525px]">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> Raw Ledger</h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {recentTransactions.map(tx => {
                const isIncome = !tx.source_account_id && tx.destination_account_id
                const isTransfer = tx.source_account_id && tx.destination_account_id
                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${isIncome ? 'bg-emerald-50' : (isTransfer ? 'bg-blue-50' : 'bg-red-50')}`}>
                        {isIncome ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : (isTransfer ? <ArrowDownRight className="w-4 h-4 text-blue-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{tx.description || 'Transaction'}</p>
                        <p className="text-xs text-slate-400 capitalize">{tx.category || 'Uncategorized'}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${isIncome ? 'text-emerald-600' : (isTransfer ? 'text-slate-600' : 'text-slate-900')}`}>
                      {isIncome ? '+' : (isTransfer ? '' : '-')}{formatMYR(tx.amount)}
                    </span>
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