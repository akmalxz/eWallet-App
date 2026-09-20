import { useState } from 'react'
import { 
  X, ChevronDown, ChevronUp, ScanText, PlusCircle, 
  Target, List, AlertTriangle, Check 
} from 'lucide-react'
import { ActionLedger } from '../components/dashboard/ActionLedger'
import { CommitmentRadar } from '../components/dashboard/CommitmentRadar'
import { supabase } from '../lib/supabaseClient'
import { formatMYR } from '../utils/formatters'

export function LogItemPage({ 
  user, accounts, mainCategories, getSubCategories, fetchAllData, showToast, 
  recentTransactions, handleApproveTransaction, handleDeleteTransaction, 
  handleEditTransaction, onRefresh, isRefreshing, onClose,
  radarStats, radarCommitments, activeRadarId, setRadarAccountId, 
  onAddCommitment, handleDeleteCommitment, 
  handleToggleCommitment, handleMarkAsPaid
}) {
  // Extract Pending OCR items vs Verified Ledger items
  const pendingTransactions = recentTransactions?.filter(tx => tx.needs_review) || []
  const verifiedTransactions = recentTransactions?.filter(tx => !tx.needs_review) || []

  // Accordion State (Defaults to OCR if there are pending items, otherwise Log)
  const [activeSection, setActiveSection] = useState(pendingTransactions.length > 0 ? 'ocr' : 'log')

  // Form State
  const [txType, setTxType] = useState('expense') 
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [category, setCategory] = useState('uncategorized')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]) // NEW: default today YYYY-MM-DD
  const [source, setSource] = useState(accounts[0]?.id || '')
  const [dest, setDest] = useState(accounts[0]?.id || '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        user_id: user.id, 
        description: desc || 'Manual Entry', 
        amount: Math.abs(parseFloat(amount)), 
        category,
        transaction_date: new Date(`${txDate}T12:00:00`).toISOString(), // NEW
        source_account_id: txType === 'income' ? null : source,
        destination_account_id: txType === 'expense' ? null : (txType === 'income' ? source : dest)
      }
      const { error } = await supabase.from('transactions').insert([payload])
      if (error) throw error
      
      showToast('Transaction logged successfully!', 'success')
      setAmount('')
      setDesc('')
      fetchAllData()
    } catch (error) { 
      showToast('Error saving transaction: ' + error.message, 'error') 
    } finally { 
      setSaving(false) 
    }
  }

  // Reusable Accordion Wrapper with Smooth Slide Animation
    // Reusable Accordion Wrapper with Smooth Slide Animation
  const AccordionSection = ({ id, title, icon: Icon, badgeCount, children }) => {
    const isOpen = activeSection === id
    return (
      <div className={`bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl overflow-hidden shadow-sm transition-all duration-300 mb-4 ${isOpen ? 'ring-2 ring-blue-500/20' : 'hover:bg-white/80'}`}>
        
        {/* Header Button */}
        <button 
          onClick={() => setActiveSection(isOpen ? null : id)} 
          className="w-full flex items-center justify-between p-5 transition-colors outline-none group"
        >
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${isOpen ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-base transition-colors ${isOpen ? 'text-blue-900' : 'text-slate-700'}`}>{title}</span>
              {badgeCount > 0 && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-all duration-300 ${isOpen ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                  {badgeCount}
                </span>
              )}
            </div>
          </div>
          <div className={`p-1 rounded-full transition-all duration-300 ${isOpen ? 'bg-blue-50 text-blue-500 rotate-180' : 'text-slate-400 group-hover:bg-slate-100'}`}>
            <ChevronDown className="w-5 h-5" />
          </div>
        </button>
        
        {/* CSS Grid Smooth Slide Transition */}
        <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden min-h-0">
            <div className="p-5 pt-0 border-t border-white/40 bg-white/30">
              {children}
            </div>
          </div>
        </div>
        
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      <div className="space-y-2">
        
        {/* SECTION 1: OCR VERIFICATION */}
        <AccordionSection 
          id="ocr" 
          title="OCR Verification" 
          icon={ScanText} 
          badgeCount={pendingTransactions.length}
        >
          {pendingTransactions.length === 0 ? (
            <div className="text-center p-6 text-slate-500 text-sm">
              <ScanText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No pending OCR scans to verify.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTransactions.map(tx => (
                <div key={tx.id} className="bg-amber-50/80 border border-amber-200/50 rounded-2xl p-4 shadow-sm relative">
                  <div className="flex justify-between items-start mb-3">
                    <div className="pr-4">
                      <p className="text-sm font-bold text-amber-900 leading-tight">{tx.description}</p>
                      <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3"/> Pending Verification
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{formatMYR(tx.amount)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="date"
                      id={`date-select-${tx.id}`}
                      name={`date-select-${tx.id}`}
                      aria-label="Transaction Date"
                      defaultValue={new Date(tx.transaction_date || tx.created_at).toISOString().split('T')[0]}
                      className="bg-white/80 border border-amber-200 text-xs rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <select 
                      id={`cat-select-${tx.id}`}
                      name={`cat-select-${tx.id}`}
                      aria-label="Transaction Category"
                      defaultValue={tx.category} 
                      className="flex-1 bg-white/80 border border-amber-200 text-xs rounded-xl px-2 py-1.5 outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="uncategorized">Select Category...</option>
                      {mainCategories.map(main => (
                        <optgroup key={main.id} label={main.name}>
                          {getSubCategories(main.id).map(sub => (
                            <option key={sub.id} value={`${main.name} > ${sub.name}`}>{sub.name}</option>
                          ))}
                          {getSubCategories(main.id).length === 0 && <option value={main.name}>{main.name} (General)</option>}
                        </optgroup>
                      ))}
                    </select>
                    <button 
                        onClick={() => handleApproveTransaction(
                            tx.id,
                            document.getElementById(`cat-select-${tx.id}`).value,
                            document.getElementById(`date-select-${tx.id}`).value
                        )} 
                        aria-label="Approve Transaction"
                        className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-xl transition-colors shadow-sm flex items-center justify-center shrink-0"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AccordionSection>

        {/* SECTION 2: LOG NEW EXPENSES */}
        <AccordionSection id="log" title="Log New Expense" icon={PlusCircle}>
          {/* Segmented Type Controller */}
          <div className="flex p-1 mb-6 bg-slate-100/80 backdrop-blur-md rounded-xl shadow-inner border border-slate-200/50 relative">
            {['expense', 'income', 'transfer'].map((t) => (
              <button 
                key={t} 
                onClick={(e) => {
                  e.preventDefault()
                  setTxType(t)
                }} 
                className={`flex-1 py-2 text-sm font-bold capitalize rounded-lg transition-all duration-300 z-10 ${
                  txType === t 
                    ? 'text-slate-800 shadow-sm bg-white' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="tx-date" className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                <input 
                  id="tx-date"
                  name="tx-date"
                  type="date" 
                  required 
                  value={txDate} 
                  onChange={(e) => setTxDate(e.target.value)} 
                  className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm transition-all" 
                />
              </div>
              <div>
                <label htmlFor="tx-amount" className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                <input 
                  id="tx-amount"
                  name="tx-amount"
                  type="number" 
                  step="0.01" 
                  required 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" 
                  placeholder="0.00" 
                />
              </div>
              <div>
                <label htmlFor="tx-category" className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                <select 
                  id="tx-category"
                  name="tx-category"
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                >
                  <option value="uncategorized">Select...</option>
                  {mainCategories.map(main => (
                    <optgroup key={main.id} label={main.name}>
                      {getSubCategories(main.id).map(sub => (
                        <option key={sub.id} value={`${main.name} > ${sub.name}`}>{sub.name}</option>
                      ))}
                      {getSubCategories(main.id).length === 0 && <option value={main.name}>{main.name} (General)</option>}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="tx-desc" className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
              <input 
                id="tx-desc"
                name="tx-desc"
                type="text" 
                required 
                value={desc} 
                onChange={(e) => setDesc(e.target.value)} 
                className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                placeholder="e.g. Salary, Lunch at Nasi Kandar" 
              />
            </div>

            {txType !== 'transfer' ? (
              <div>
                <label htmlFor="tx-source" className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  {txType === 'income' ? 'Deposit To' : 'Pay From'}
                </label>
                <select 
                  id="tx-source"
                  name="tx-source"
                  value={source} 
                  onChange={(e) => setSource(e.target.value)} 
                  className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tx-transfer-from" className="block text-xs font-bold text-slate-500 uppercase mb-1">From</label>
                  <select 
                    id="tx-transfer-from"
                    name="tx-transfer-from"
                    value={source} 
                    onChange={(e) => setSource(e.target.value)} 
                    className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="tx-transfer-to" className="block text-xs font-bold text-slate-500 uppercase mb-1">To</label>
                  <select 
                    id="tx-transfer-to"
                    name="tx-transfer-to"
                    value={dest} 
                    onChange={(e) => setDest(e.target.value)} 
                    className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                  </select>
                </div>
              </div>
            )}
            <button type="submit" disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl mt-4 transition-colors">
              {saving ? 'Saving...' : 'Log Transaction'}
            </button>
          </form>
        </AccordionSection>

        {/* SECTION 3: COMMITMENT RADAR */}
        <AccordionSection id="radar" title="Commitment Radar" icon={Target}>
          <div className="pt-2">
            <CommitmentRadar 
              radarStats={radarStats} 
              commitments={radarCommitments} 
              accounts={accounts}
              selectedAccountId={activeRadarId}
              onSelectAccount={setRadarAccountId}
              onAddCommitment={onAddCommitment}
              onDeleteCommitment={handleDeleteCommitment} 
              onToggleCommitment={handleToggleCommitment} 
              onMarkAsPaid={handleMarkAsPaid}
            />
          </div>
        </AccordionSection>

        {/* SECTION 4: ACTION LEDGER */}
        <div className="mt-3 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          
            <ActionLedger 
              recentTransactions={verifiedTransactions}
              mainCategories={mainCategories} 
              getSubCategories={getSubCategories}
              handleApproveTransaction={handleApproveTransaction} 
              handleDeleteTransaction={handleDeleteTransaction}
              handleEditTransaction={handleEditTransaction} 
              onRefresh={onRefresh}
              isRefreshing={isRefreshing} 
              accounts={accounts} 
              onAddTransaction={() => setActiveSection('log')} 
            />
        </div>

      </div>
    </div>
  )
}