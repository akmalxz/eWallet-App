// src/pages/ProfilePage.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  User, LogOut, Plus, Trash2, CornerDownRight, 
  Target, Building2, TrendingUp, TrendingDown, ChevronRight, X
} from 'lucide-react'

import { formatMYR } from '../utils/formatters' 

export function ProfilePage({ 
  user, accounts, categories, getSubCategories, classifications, 
  commitments = [], fetchAllData, showToast 
}) {
  const [activeModal, setActiveModal] = useState(null) // 'banks' | 'income' | 'expense' | 'commitments' | null
  
  // Form States
  const [newBankName, setNewBankName] = useState('')
  const [newBankClass, setNewBankClass] = useState(classifications[0]?.key_name || 'hub')
  
  const [newMainCategoryName, setNewMainCategoryName] = useState('')
  const [addingSubToId, setAddingSubToId] = useState(null)
  const [newSubCategoryName, setNewSubCategoryName] = useState('')
  
  const [newCommitmentName, setNewCommitmentName] = useState('')
  const [newCommitmentAmount, setNewCommitmentAmount] = useState('')
  const [newCommitmentDueDay, setNewCommitmentDueDay] = useState('')
  const [newCommitmentAccount, setNewCommitmentAccount] = useState('')
  
  const [saving, setSaving] = useState(false)

  // Computed Category Groupings
  const mainCategories = categories.filter(c => !c.parent_id)
  const incomeCategory = mainCategories.find(c => c.name.toLowerCase() === 'income')
  const expenseCategories = mainCategories.filter(c => c.name.toLowerCase() !== 'income')

  const openModal = (section) => {
    setActiveModal(section)
    setAddingSubToId(null) // Reset inline forms when opening a new modal
  }
  
  const closeModal = () => {
    setActiveModal(null)
    setAddingSubToId(null)
  }

  // ============================================
  // DATABASE HANDLERS
  // ============================================
  const handleAddBank = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('accounts').insert([{ 
        user_id: user.id, account_name: newBankName.trim(), classification: newBankClass 
      }])
      if (error) throw error
      setNewBankName('')
      showToast('Bank added successfully!', 'success')
      fetchAllData()
    } catch (error) { showToast(error.message, 'error') } finally { setSaving(false) }
  }

  const handleDeleteBank = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id)
      if (error) throw error
      showToast('Bank deleted', 'success')
      fetchAllData()
    } catch (error) { showToast('Cannot delete this bank. It has transactions.', 'error') }
  }

  const handleAddMainCategory = async (e, forceName = null) => {
    if (e) e.preventDefault()
    const nameToSave = forceName || newMainCategoryName.trim()
    if (!nameToSave) return
    
    setSaving(true)
    try {
      const { error } = await supabase.from('categories').insert([{ user_id: user.id, name: nameToSave }])
      if (error) throw error
      setNewMainCategoryName('')
      showToast(`${nameToSave} category added!`, 'success')
      fetchAllData()
    } catch (error) { showToast(error.message, 'error') } finally { setSaving(false) }
  }

  const handleAddSubCategory = async (parentId) => {
    if (!newSubCategoryName.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase.from('categories').insert([{ 
        user_id: user.id, name: newSubCategoryName.trim(), parent_id: parentId 
      }])
      if (error) throw error
      setNewSubCategoryName(''); setAddingSubToId(null)
      showToast('Subcategory added!', 'success')
      fetchAllData()
    } catch (error) { showToast(error.message, 'error') } finally { setSaving(false) }
  }

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"? Subcategories will also be deleted.`)) return
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
      showToast('Category deleted', 'success')
      fetchAllData()
    } catch (error) { showToast('Cannot delete category. It has transactions.', 'error') }
  }

  const handleAddCommitment = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('commitments').insert([{
        user_id: user.id, name: newCommitmentName.trim(),
        amount: parseFloat(newCommitmentAmount), due_day_of_month: parseInt(newCommitmentDueDay),
        account_id: newCommitmentAccount, is_active: true
      }])
      if (error) throw error
      setNewCommitmentName(''); setNewCommitmentAmount(''); setNewCommitmentDueDay(''); setNewCommitmentAccount('');
      showToast('Commitment added!', 'success')
      fetchAllData()
    } catch (error) { showToast(error.message, 'error') } finally { setSaving(false) }
  }

  const handleDeleteCommitment = async (id, name) => {
    if (!window.confirm(`Delete commitment "${name}"?`)) return
    try {
      const { error } = await supabase.from('commitments').delete().eq('id', id)
      if (error) throw error
      showToast('Commitment deleted', 'success')
      fetchAllData()
    } catch (error) { showToast(error.message, 'error') }
  }

  const handleToggleCommitment = async (id, isActive) => {
    try {
      const { error } = await supabase.from('commitments').update({ is_active: !isActive }).eq('id', id)
      if (error) throw error
      fetchAllData()
    } catch (error) { showToast(error.message, 'error') }
  }

  // ============================================
  // UI COMPONENTS
  // ============================================
  const SetupButton = ({ id, title, icon: Icon }) => (
    <button 
      onClick={() => openModal(id)} 
      className="w-full bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-5 mb-4 flex items-center justify-between hover:bg-white/80 transition-all shadow-sm outline-none"
    >
      <div className="flex items-center gap-4">
        {/* Switched to simple slate/black icons */}
        <div className="p-2.5 bg-slate-100 rounded-xl text-slate-900">
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-bold text-slate-800 text-base">{title}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-400" />
    </button>
  )

  const ModalWrapper = ({ title, children }) => (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white/90 backdrop-blur-xl border border-white/50 rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={closeModal} className="p-2 hover:bg-slate-200/50 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500"/>
          </button>
        </div>
        
        {/* Scrollable Form Content */}
        <div className="overflow-y-auto flex-1 pr-2 scrollbar-hide space-y-6">
          {children}
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Profile Header */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-3xl shadow-sm flex items-center gap-4 mb-8">
        <div className="bg-slate-900 p-4 rounded-full text-white"><User className="w-8 h-8" /></div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">Your Vault</h2>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="bg-red-50/80 text-red-500 p-3 rounded-xl hover:bg-red-100 transition-colors">
          <LogOut className="w-5 h-5"/>
        </button>
      </div>

      {/* Trigger Buttons */}
      <SetupButton id="banks" title="Bank Accounts" icon={Building2} />
      <SetupButton id="income" title="Income Categories" icon={TrendingUp} />
      <SetupButton id="expense" title="Expense Categories" icon={TrendingDown} />
      <SetupButton id="commitments" title="Monthly Commitments" icon={Target} />

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}

      {activeModal === 'banks' && (
        <ModalWrapper title="Bank Accounts">
          <div className="space-y-3">
            {accounts.map(acc => (
              <div key={acc.id} className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-white/60">
                <div>
                  <p className="text-sm font-bold text-slate-800">{acc.account_name}</p>
                  <p className="text-xs text-slate-400 capitalize">{classifications.find(c => c.key_name === acc.classification)?.label || acc.classification}</p>
                </div>
                <button onClick={() => handleDeleteBank(acc.id, acc.account_name)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddBank} className="border-t border-slate-200/50 pt-6 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Add New Account</h3>
            <input type="text" required value={newBankName} onChange={(e) => setNewBankName(e.target.value)} className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Bank Name (e.g. Maybank)" />
            <select value={newBankClass} onChange={(e) => setNewBankClass(e.target.value)} className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              {classifications.map(c => <option key={c.id} value={c.key_name}>{c.label}</option>)}
            </select>
            <button type="submit" disabled={saving || !newBankName} className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl text-sm">Save Account</button>
          </form>
        </ModalWrapper>
      )}

      {activeModal === 'income' && (
        <ModalWrapper title="Income Setup">
          {!incomeCategory ? (
            <div className="text-center p-4">
              <p className="text-sm text-slate-500 mb-3">You don't have an Income category set up yet.</p>
              <button onClick={(e) => handleAddMainCategory(e, 'Income')} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold w-full">Create "Income" Category</button>
            </div>
          ) : (
            <div className="space-y-2">
              {getSubCategories(incomeCategory.id).map(sub => (
                <div key={sub.id} className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-white/60">
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><CornerDownRight className="w-4 h-4 text-slate-300"/> {sub.name}</p>
                  <button onClick={() => handleDeleteCategory(sub.id, sub.name)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
              
              {addingSubToId === incomeCategory.id ? (
                <div className="flex gap-2 pt-4">
                  <input autoFocus type="text" value={newSubCategoryName} onChange={(e) => setNewSubCategoryName(e.target.value)} placeholder="e.g. Salary, Side Hustle" className="flex-1 bg-white/60 border border-white/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" />
                  <button onClick={() => handleAddSubCategory(incomeCategory.id)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold">Save</button>
                </div>
              ) : (
                <button onClick={() => { setAddingSubToId(incomeCategory.id); setNewSubCategoryName('') }} className="w-full flex justify-center items-center gap-2 bg-slate-100 text-slate-900 py-3 rounded-xl text-sm font-bold mt-4 hover:bg-slate-200 transition-colors">
                  <Plus className="w-4 h-4"/> Add Income Stream
                </button>
              )}
            </div>
          )}
        </ModalWrapper>
      )}

      {activeModal === 'expense' && (
        <ModalWrapper title="Expense Setup">
          <div className="space-y-4">
            {expenseCategories.map(main => (
              <div key={main.id} className="bg-white/40 border border-white/60 rounded-xl overflow-hidden">
                <div className="flex justify-between items-center p-3 bg-white/50">
                  <p className="text-sm font-bold text-slate-800">{main.name}</p>
                  <div className="flex gap-1">
                    <button onClick={() => { setAddingSubToId(main.id); setNewSubCategoryName('') }} className="text-blue-500 hover:text-blue-700 p-1.5"><Plus className="w-4 h-4"/></button>
                    <button onClick={() => handleDeleteCategory(main.id, main.name)} className="text-red-400 hover:text-red-600 p-1.5"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  {getSubCategories(main.id).map(sub => (
                    <div key={sub.id} className="flex justify-between items-center pl-6 pr-2 py-1.5 hover:bg-white/60 rounded-lg">
                      <p className="text-xs font-medium text-slate-600 flex items-center gap-2"><CornerDownRight className="w-3 h-3 text-slate-300"/> {sub.name}</p>
                      <button onClick={() => handleDeleteCategory(sub.id, sub.name)} className="text-red-300 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                    </div>
                  ))}
                  {addingSubToId === main.id && (
                    <div className="pl-6 pr-2 py-2 flex gap-2">
                      <input autoFocus type="text" value={newSubCategoryName} onChange={(e) => setNewSubCategoryName(e.target.value)} placeholder="Subcategory..." className="flex-1 bg-white/80 border border-white/60 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
                      <button onClick={() => handleAddSubCategory(main.id)} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Save</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddMainCategory} className="border-t border-slate-200/50 pt-6 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase">New Master Expense Category</h3>
            <div className="flex gap-2">
              <input type="text" required value={newMainCategoryName} onChange={(e) => setNewMainCategoryName(e.target.value)} className="flex-1 bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Housing, Transportation" />
              <button type="submit" disabled={saving || !newMainCategoryName} className="bg-slate-900 text-white font-medium px-4 py-2 rounded-xl text-sm">Add</button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {activeModal === 'commitments' && (
        <ModalWrapper title="Commitments">
          <div className="space-y-3">
            {commitments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No fixed commitments tracked yet.</p>
            ) : (
              commitments.map(comm => (
                <div key={comm.id} className={`flex justify-between items-center p-3 rounded-xl border ${comm.is_active ? 'bg-white/50 border-white/60' : 'bg-slate-50/30 border-white/20 opacity-60'}`}>
                  <div>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2">{comm.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatMYR(comm.amount)} on day {comm.due_day_of_month}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleToggleCommitment(comm.id, comm.is_active)} className="p-1.5 text-slate-400 hover:text-slate-600" title="Toggle active status">
                      {comm.is_active ? '✅' : '⏸️'}
                    </button>
                    <button onClick={() => handleDeleteCommitment(comm.id, comm.name)} className="text-red-400 hover:text-red-600 p-1.5"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleAddCommitment} className="border-t border-slate-200/50 pt-6 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Add New Commitment</h3>
            <input type="text" required value={newCommitmentName} onChange={(e) => setNewCommitmentName(e.target.value)} className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Netflix, Rent" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" required step="0.01" min="0.01" value={newCommitmentAmount} onChange={(e) => setNewCommitmentAmount(e.target.value)} className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Amount" />
              <input type="number" required min="1" max="31" value={newCommitmentDueDay} onChange={(e) => setNewCommitmentDueDay(e.target.value)} className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Due day (1-31)" />
            </div>
            <select required value={newCommitmentAccount} onChange={(e) => setNewCommitmentAccount(e.target.value)} className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select deduct account...</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
            </select>
            <button type="submit" disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl text-sm transition-colors">Add Commitment</button>
          </form>
        </ModalWrapper>
      )}

    </div>
  )
}