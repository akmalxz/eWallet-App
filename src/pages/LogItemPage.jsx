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

  // Reusable Accordion Wrapper
  const AccordionSection = ({ id, title, icon: Icon, badgeCount, children }) => {
    const isOpen = activeSection === id
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl overflow-hidden shadow-sm transition-all mb-4">
        <button 
          onClick={() => setActiveSection(isOpen ? null : id)} 
          className="w-full flex items-center justify-between p-5 hover:bg-white/40 transition-colors outline-none"
        >
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${isOpen ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-lg">{title}</span>
              {badgeCount > 0 && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {badgeCount}
                </span>
              )}
            </div>
          </div>
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>
        {isOpen && (
          <div className="p-5 border-t border-white/40 bg-white/30 animate-in fade-in duration-300">
            {children}
          </div>
        )}
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
                  <div className="flex gap-2">
                    <select 
                      id={`cat-select-${tx.id}`}
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
                      onClick={() => handleApproveTransaction(tx.id, document.getElementById(`cat-select-${tx.id}`).value)} 
                      className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-xl transition-colors shadow-sm"
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
          <div className="flex gap-2 mb-6 bg-white/50 p-1 rounded-xl border border-white/40">
            {['expense', 'income', 'transfer'].map(t => (
              <button key={t} onClick={() => setTxType(t)} className={`flex-1 py-2 text-sm font-medium capitalize rounded-lg transition-all ${txType === t ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>
                {t}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all">
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
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
              <input type="text" required value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="e.g. Salary, Lunch at Nasi Kandar" />
            </div>

            {txType !== 'transfer' ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{txType === 'income' ? 'Deposit To' : 'Pay From'}</label>
                <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">From</label>
                  <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">To</label>
                  <select value={dest} onChange={(e) => setDest(e.target.value)} className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all">
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

        {/* SECTION 4: ACTION LEDGER (Static Section) */}
        <div className="mt-8 mb-4 flex items-center gap-2 px-2">
          <div className="p-2 rounded-lg bg-slate-200 text-slate-600">
            <List className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Action Ledger</h2>
        </div>
        
        <ActionLedger 
            recentTransactions={verifiedTransactions} // Only pass verified items
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
  )
}