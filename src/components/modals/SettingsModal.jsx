// src/components/modals/SettingsModal.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  LogOut, Plus, Trash2, CornerDownRight, CheckCircle, PauseCircle,
  Target, Building2, TrendingUp, TrendingDown, ChevronRight, X, Zap, Copy, RefreshCw, AlertTriangle,
  Edit2, Save, Layers, Hash
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { ConfirmSheet } from '../shared/ConfirmSheet'

export const SettingsModal = ({
  setIsOpen,
  user,
  accounts,
  categories,
  getSubCategories,
  classifications,
  commitments = [],
  fetchAllData,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState('categories')
  const [newBankName, setNewBankName] = useState('')
  const [newBankClass, setNewBankClass] = useState(classifications[0]?.key_name || 'hub')

  const [newMainCategoryName, setNewMainCategoryName] = useState('')
  const [newMainCategoryKeywords, setNewMainCategoryKeywords] = useState('')
  const [addingSubToId, setAddingSubToId] = useState(null)
  const [newSubCategoryName, setNewSubCategoryName] = useState('')
  const [newSubCategoryKeywords, setNewSubCategoryKeywords] = useState('')

  const [newCommitmentName, setNewCommitmentName] = useState('')
  const [newCommitmentAmount, setNewCommitmentAmount] = useState('')
  const [newCommitmentDueDay, setNewCommitmentDueDay] = useState('')
  const [newCommitmentAccount, setNewCommitmentAccount] = useState('')

  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  // Shape: { type: 'bank' | 'category' | 'commitment', id, name }

  const [editingItemId, setEditingItemId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editColor, setEditColor] = useState('blue')

  // ============================================
  // DELETE DISPATCHER
  // ============================================
  const requestDelete = (type, id, name) => setPendingDelete({ type, id, name })

  const runDelete = async () => {
    if (!pendingDelete) return
    const { type, id, name } = pendingDelete
    setSaving(true)

    try {
      if (type === 'bank') {
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('id')
          .or(`source_account_id.eq.${id},destination_account_id.eq.${id}`)
          .limit(1)
        if (txError) console.error('Transaction check error:', txError)
        if (transactions && transactions.length > 0) {
          throw new Error('Cannot delete this bank because it has associated transactions')
        }
        const { error } = await supabase.from('accounts').delete().eq('id', id)
        if (error) throw error
        showToast('Bank deleted successfully', 'success')
      } else if (type === 'category') {
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('id')
          .eq('category', name)
          .limit(1)
        if (txError) console.error('Transaction check error:', txError)
        if (transactions && transactions.length > 0) {
          throw new Error('Cannot delete this category because it has associated transactions')
        }
        const { error } = await supabase.from('categories').delete().eq('id', id)
        if (error) throw error
        showToast('Category deleted successfully', 'success')
      } else if (type === 'commitment') {
        const { error } = await supabase.from('commitments').delete().eq('id', id)
        if (error) throw error
        showToast('Commitment deleted successfully', 'success')
      }

      setPendingDelete(null)
      fetchAllData()
    } catch (error) {
      showToast(error.message || 'Delete failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // BANK ACTIONS
  // ============================================
  const handleAddBank = async (e) => {
    e.preventDefault()
    if (!newBankName.trim()) {
      showToast('Please enter a bank name', 'warning')
      return
    }

    setSaving(true)
    try {
      const existingBank = accounts.find(a =>
        a.account_name.toLowerCase() === newBankName.toLowerCase()
      )
      if (existingBank) throw new Error('A bank with this name already exists')

      const { error } = await supabase.from('accounts').insert([{
        user_id: user.id,
        account_name: newBankName.trim(),
        classification: newBankClass
      }])
      if (error) throw error

      setNewBankName('')
      showToast('Bank added successfully!', 'success')
      fetchAllData()
    } catch (error) {
      showToast('Error adding bank: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateBank = async (id) => {
    if (!editValue.trim()) return setEditingItemId(null)
    setSaving(true)
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ account_name: editValue.trim(), color_theme: editColor })
        .eq('id', id)
      if (error) throw error
      showToast('Bank updated successfully', 'success')
      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
      setEditingItemId(null)
    }
  }

  // ============================================
  // CATEGORY ACTIONS
  // ============================================
  const handleUpdateCategory = async (id) => {
    if (!editValue.trim()) return setEditingItemId(null)
    setSaving(true)
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editValue.trim() })
        .eq('id', id)
      if (error) throw error
      showToast('Category updated successfully', 'success')
      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
      setEditingItemId(null)
    }
  }

  const handleAddMainCategory = async (e) => {
    e.preventDefault()
    if (!newMainCategoryName.trim()) {
      showToast('Please enter a category name', 'warning')
      return
    }

    setSaving(true)
    try {
      const existingCategory = categories.find(c =>
        c.name.toLowerCase() === newMainCategoryName.toLowerCase()
      )
      if (existingCategory) throw new Error('A category with this name already exists')

      const keywordsArray = newMainCategoryKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0)

      const { error } = await supabase.from('categories').insert([{
        user_id: user.id,
        name: newMainCategoryName.trim(),
        keywords: keywordsArray.length > 0 ? keywordsArray : null
      }])
      if (error) throw error

      setNewMainCategoryName('')
      setNewMainCategoryKeywords('')
      showToast('Category added successfully!', 'success')
      fetchAllData()
    } catch (error) {
      showToast('Error: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSubCategory = async (parentId) => {
    if (!newSubCategoryName.trim()) {
      showToast('Please enter a subcategory name', 'warning')
      return
    }

    setSaving(true)
    try {
      const existingSub = getSubCategories(parentId).find(c =>
        c.name.toLowerCase() === newSubCategoryName.toLowerCase()
      )
      if (existingSub) throw new Error('A subcategory with this name already exists under this category')

      const keywordsArray = newSubCategoryKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0)

      const { error } = await supabase.from('categories').insert([{
        user_id: user.id,
        name: newSubCategoryName.trim(),
        parent_id: parentId,
        keywords: keywordsArray.length > 0 ? keywordsArray : null
      }])
      if (error) throw error

      setNewSubCategoryName('')
      setNewSubCategoryKeywords('')
      setAddingSubToId(null)
      showToast('Subcategory added successfully!', 'success')
      fetchAllData()
    } catch (error) {
      showToast('Error: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // COMMITMENT ACTIONS
  // ============================================
  const handleAddCommitment = async (e) => {
    e.preventDefault()
    if (!newCommitmentName.trim()) {
      showToast('Please enter a commitment name', 'warning')
      return
    }
    if (!newCommitmentAmount || parseFloat(newCommitmentAmount) <= 0) {
      showToast('Please enter a valid amount', 'warning')
      return
    }
    if (!newCommitmentDueDay || parseInt(newCommitmentDueDay) < 1 || parseInt(newCommitmentDueDay) > 31) {
      showToast('Please enter a valid due day (1-31)', 'warning')
      return
    }
    if (!newCommitmentAccount) {
      showToast('Please select an account', 'warning')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('commitments').insert([{
        user_id: user.id,
        name: newCommitmentName.trim(),
        amount: parseFloat(newCommitmentAmount),
        due_day_of_month: parseInt(newCommitmentDueDay),
        account_id: newCommitmentAccount,
        is_active: true
      }])
      if (error) throw error

      setNewCommitmentName('')
      setNewCommitmentAmount('')
      setNewCommitmentDueDay('')
      setNewCommitmentAccount('')
      showToast('Commitment added successfully!', 'success')
      fetchAllData()
    } catch (error) {
      showToast('Error adding commitment: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleCommitment = async (id, isActive) => {
    try {
      const { error } = await supabase
        .from('commitments')
        .update({ is_active: !isActive })
        .eq('id', id)
      if (error) throw error
      showToast(`Commitment ${isActive ? 'deactivated' : 'activated'} successfully`, 'success')
      fetchAllData()
    } catch (error) {
      showToast('Error toggling commitment: ' + error.message, 'error')
    }
  }

  const mainCategories = categories.filter(c => !c.parent_id)

  const getAccountName = (id) => {
    const account = accounts.find(a => a.id === id)
    return account?.account_name || 'Unknown'
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-surface rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto scrollbar-hide border border-line">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-fg">Vault Settings</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-surface-2 rounded-full transition-colors text-fg-muted"
              aria-label="Close settings"
            >
              <X className="w-5 h-5"/>
            </button>
          </div>

          <div className="flex gap-4 mb-6 border-b border-line pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('categories')}
              className={`text-sm font-bold pb-2 transition-colors whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'text-brand border-b-2 border-brand'
                  : 'text-fg-subtle hover:text-fg-muted'
              }`}
            >
              Categories
            </button>
            <button
              onClick={() => setActiveTab('nodes')}
              className={`text-sm font-bold pb-2 transition-colors whitespace-nowrap ${
                activeTab === 'nodes'
                  ? 'text-brand border-b-2 border-brand'
                  : 'text-fg-subtle hover:text-fg-muted'
              }`}
            >
              Accounts
            </button>
            <button
              onClick={() => setActiveTab('commitments')}
              className={`text-sm font-bold pb-2 transition-colors whitespace-nowrap ${
                activeTab === 'commitments'
                  ? 'text-brand border-b-2 border-brand'
                  : 'text-fg-subtle hover:text-fg-muted'
              }`}
            >
              <Layers className="w-3 h-3 inline mr-1" /> Commitments
            </button>
          </div>

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div>
              <div className="space-y-4 mb-6">
                {mainCategories.map(main => (
                  <div key={main.id} className="bg-surface-2 border border-line rounded-xl overflow-hidden">
                    <div className="flex justify-between items-center p-3 bg-surface-3/50 min-h-[50px]">
                      {editingItemId === main.id ? (
                        <div className="flex gap-2 w-full">
                          <input
                            aria-label="Edit Master Category Name"
                            autoFocus
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 bg-surface border border-line rounded-lg px-2 text-sm text-fg outline-none focus:border-brand"
                          />
                          <button onClick={() => handleUpdateCategory(main.id)} className="p-1.5 bg-success-soft text-success-text rounded-lg hover:bg-success/20" aria-label="Save"><Save className="w-4 h-4"/></button>
                          <button onClick={() => setEditingItemId(null)} className="p-1.5 bg-surface-3 text-fg-muted rounded-lg hover:bg-line-strong" aria-label="Cancel"><X className="w-4 h-4"/></button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="text-sm font-bold text-fg">{main.name}</p>
                            {main.keywords && main.keywords.length > 0 && (
                              <p className="text-xs text-fg-subtle mt-0.5">
                                <Hash className="w-3 h-3 inline mr-1" />
                                {main.keywords.join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => { setAddingSubToId(main.id); setNewSubCategoryName(''); setNewSubCategoryKeywords(''); setEditingItemId(null); }} className="text-brand hover:text-brand-hover p-1.5 transition-colors" aria-label="Add subcategory"><Plus className="w-4 h-4"/></button>
                            <button onClick={() => { setEditingItemId(main.id); setEditValue(main.name); }} className="text-fg-subtle hover:text-brand p-1.5 transition-colors" aria-label="Edit"><Edit2 className="w-4 h-4"/></button>
                            <button onClick={() => requestDelete('category', main.id, main.name)} className="text-danger/70 hover:text-danger p-1.5 transition-colors" aria-label="Delete"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="p-2 space-y-1">
                      {getSubCategories(main.id).map(sub => (
                        <div key={sub.id} className="pl-6 pr-2 py-1.5 hover:bg-surface rounded-lg transition-colors min-h-[40px]">
                          {editingItemId === sub.id ? (
                            <div className="flex gap-2">
                              <input
                                aria-label="Edit Subcategory Name"
                                autoFocus
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="flex-1 bg-surface border border-line rounded-md px-2 py-1 text-xs text-fg outline-none focus:border-brand"
                              />
                              <button onClick={() => handleUpdateCategory(sub.id)} className="p-1 text-success hover:bg-success-soft rounded" aria-label="Save"><Save className="w-3 h-3"/></button>
                              <button onClick={() => setEditingItemId(null)} className="p-1 text-fg-subtle hover:bg-surface-2 rounded" aria-label="Cancel"><X className="w-3 h-3"/></button>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-xs text-fg-muted flex items-center gap-2">
                                  <CornerDownRight className="w-3 h-3 text-fg-subtle"/> {sub.name}
                                </p>
                                {sub.keywords && sub.keywords.length > 0 && (
                                  <p className="text-[10px] text-fg-subtle pl-5">
                                    {sub.keywords.join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => { setEditingItemId(sub.id); setEditValue(sub.name); }} className="text-fg-subtle hover:text-brand transition-colors p-1" aria-label="Edit"><Edit2 className="w-3 h-3"/></button>
                                <button onClick={() => requestDelete('category', sub.id, sub.name)} className="text-danger/60 hover:text-danger transition-colors p-1" aria-label="Delete"><Trash2 className="w-3 h-3"/></button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {addingSubToId === main.id && (
                        <div key={`add-sub-${main.id}`} className="pl-6 pr-2 py-2 space-y-2">
                          <input
                            autoFocus
                            type="text"
                            value={newSubCategoryName}
                            onChange={(e) => setNewSubCategoryName(e.target.value)}
                            placeholder="Subcategory name..."
                            className="w-full bg-surface border border-line rounded-lg px-2 py-1 text-xs text-fg placeholder:text-fg-subtle outline-none focus:border-brand"
                          />
                          <input
                            type="text"
                            value={newSubCategoryKeywords}
                            onChange={(e) => setNewSubCategoryKeywords(e.target.value)}
                            placeholder="Keywords (comma separated: lunch, nasi)"
                            className="w-full bg-surface border border-line rounded-lg px-2 py-1 text-xs text-fg placeholder:text-fg-subtle outline-none focus:border-brand"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddSubCategory(main.id)}
                              className="flex-1 bg-brand-solid text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-brand-solid-hover transition-colors"
                            >
                              Add Subcategory
                            </button>
                            <button
                              onClick={() => {
                                setAddingSubToId(null)
                                setNewSubCategoryName('')
                                setNewSubCategoryKeywords('')
                              }}
                              className="px-2 text-fg-subtle hover:text-fg-muted"
                              aria-label="Cancel add subcategory"
                            >
                              <X className="w-3 h-3"/>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddMainCategory} className="border-t border-line pt-4 space-y-3">
                <h3 className="text-xs font-bold text-fg-muted uppercase">New Main Category</h3>
                <input
                  type="text"
                  required
                  value={newMainCategoryName}
                  onChange={(e) => setNewMainCategoryName(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                  placeholder="Category name (e.g. Housing)"
                />
                <input
                  type="text"
                  value={newMainCategoryKeywords}
                  onChange={(e) => setNewMainCategoryKeywords(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                  placeholder="Keywords (comma separated: rent, mortgage, house)"
                />
                <button
                  type="submit"
                  disabled={saving || !newMainCategoryName.trim()}
                  className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Category
                </button>
              </form>
            </div>
          )}

          {/* Nodes Tab */}
          {activeTab === 'nodes' && (
            <div>
              <div className="space-y-3 mb-6">
                {accounts.map(acc => {
                  const classData = classifications.find(c => c.key_name === acc.classification)
                  return (
                    <div key={acc.id} className="bg-surface-2 p-3 rounded-xl border border-line">
                      {editingItemId === acc.id ? (
                        <div className="flex gap-2">
                          <div className="flex-1 space-y-2">
                            <input
                              aria-label="Edit Bank Name"
                              autoFocus
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full bg-surface border border-line rounded-lg py-1 px-2 text-sm text-fg outline-none focus:border-brand"
                            />
                            <select
                              aria-label="Edit Bank Color"
                              value={editColor}
                              onChange={(e) => setEditColor(e.target.value)}
                              className="w-full bg-surface border border-line rounded-lg py-1 px-2 text-xs text-fg outline-none focus:border-brand"
                            >
                              <option value="blue">Blue</option>
                              <option value="emerald">Green</option>
                              <option value="purple">Purple</option>
                              <option value="rose">Red</option>
                              <option value="amber">Yellow</option>
                              <option value="slate">Dark Grey</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => handleUpdateBank(acc.id)} className="p-1.5 bg-success-soft text-success-text rounded-lg hover:bg-success/20" aria-label="Save"><Save className="w-4 h-4"/></button>
                            <button onClick={() => setEditingItemId(null)} className="p-1.5 bg-surface-3 text-fg-muted rounded-lg hover:bg-line-strong" aria-label="Cancel"><X className="w-4 h-4"/></button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-bold text-fg">{acc.account_name}</p>
                            <p className="text-xs text-fg-subtle capitalize">{classData?.label || acc.classification}</p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => { setEditingItemId(acc.id); setEditValue(acc.account_name); setEditColor(acc.color_theme || 'slate'); }}
                              className="text-fg-subtle hover:text-brand p-2 transition-colors"
                              aria-label="Edit account"
                            >
                              <Edit2 className="w-4 h-4"/>
                            </button>
                            <button
                              onClick={() => requestDelete('bank', acc.id, acc.account_name)}
                              className="text-danger/70 hover:text-danger p-2 transition-colors"
                              aria-label="Delete account"
                            >
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <form onSubmit={handleAddBank} className="border-t border-line pt-4 space-y-4">
                <h3 className="text-xs font-bold text-fg-muted uppercase">Add New Account</h3>
                <input
                  type="text"
                  required
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                  placeholder="Bank Name (e.g. CIMB)"
                />
                <select
                  value={newBankClass}
                  onChange={(e) => setNewBankClass(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                >
                  {classifications.map(c => (
                    <option key={c.id} value={c.key_name}>{c.label}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={saving || !newBankName.trim()}
                  className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Account
                </button>
              </form>
            </div>
          )}

          {/* Commitments Tab */}
          {activeTab === 'commitments' && (
            <div>
              <div className="space-y-3 mb-6">
                {commitments.length === 0 ? (
                  <div className="bg-surface-2 border border-line rounded-xl p-6 text-center">
                    <Layers className="w-8 h-8 text-fg-subtle mx-auto mb-2" />
                    <p className="text-sm text-fg-muted">No commitments yet</p>
                    <p className="text-xs text-fg-subtle">Add your subscriptions and bills below</p>
                  </div>
                ) : (
                  commitments.map(comm => {
                    const account = accounts.find(a => a.id === comm.account_id)
                    return (
                      <div key={comm.id} className={`flex justify-between items-center p-3 rounded-xl border ${
                        comm.is_active ? 'bg-surface-2 border-line' : 'bg-surface-2/50 border-line/50 opacity-60'
                      }`}>
                        <div>
                          <p className="text-sm font-bold text-fg flex items-center gap-2">
                            {comm.name}
                            {!comm.is_active && <span className="text-xs text-danger/70 font-normal">(Inactive)</span>}
                          </p>
                          <p className="text-xs text-fg-subtle">
                            {formatMYR(comm.amount)} on day {comm.due_day_of_month} • {account?.account_name || 'No account'}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleToggleCommitment(comm.id, comm.is_active)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              comm.is_active
                                ? 'text-success hover:text-success/80'
                                : 'text-fg-subtle/50 hover:text-fg-subtle'
                            }`}
                            title={comm.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {comm.is_active ? <CheckCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => requestDelete('commitment', comm.id, comm.name)}
                            className="text-danger/70 hover:text-danger p-1.5 transition-colors"
                            title="Delete commitment"
                          >
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <form onSubmit={handleAddCommitment} className="border-t border-line pt-4 space-y-4">
                <h3 className="text-xs font-bold text-fg-muted uppercase flex items-center gap-2">
                  <Layers className="w-3 h-3" /> Add New Commitment
                </h3>
                <input
                  type="text"
                  required
                  value={newCommitmentName}
                  onChange={(e) => setNewCommitmentName(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                  placeholder="e.g. Netflix, Spotify, Phone Bill"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    value={newCommitmentAmount}
                    onChange={(e) => setNewCommitmentAmount(e.target.value)}
                    className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                    placeholder="Amount"
                  />
                  <input
                    type="number"
                    required
                    min="1"
                    max="31"
                    value={newCommitmentDueDay}
                    onChange={(e) => setNewCommitmentDueDay(e.target.value)}
                    className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                    placeholder="Due day (1-31)"
                  />
                </div>
                <select
                  value={newCommitmentAccount}
                  onChange={(e) => setNewCommitmentAccount(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl py-2 px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                  required
                >
                  <option value="">Select account...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.account_name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Commitment'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {pendingDelete && (
        <ConfirmSheet
          destructive
          saving={saving}
          title={`Delete "${pendingDelete.name}"?`}
          message={(() => {
            if (pendingDelete.type === 'bank') return "This can't be undone."
            if (pendingDelete.type === 'category') return "Any subcategories will also be deleted. This can't be undone."
            return "This can't be undone."
          })()}
          confirmLabel="Delete"
          onConfirm={runDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  )
}