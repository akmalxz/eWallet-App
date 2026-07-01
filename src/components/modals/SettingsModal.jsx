// src/components/modals/SettingsModal.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { X, Plus, Trash2, CornerDownRight, Hash } from 'lucide-react'

export const SettingsModal = ({ 
  setIsOpen, 
  user, 
  accounts, 
  categories, 
  getSubCategories, 
  classifications, 
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
  
  const [saving, setSaving] = useState(false)

  // Bank Actions
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
      if (existingBank) {
        throw new Error('A bank with this name already exists')
      }

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

  const handleDeleteBank = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return
    
    try {
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id')
        .or(`source_account_id.eq.${id},destination_account_id.eq.${id}`)
        .limit(1)
      
      if (txError) {
        console.error('Transaction check error:', txError)
      }
      
      if (transactions && transactions.length > 0) {
        throw new Error('Cannot delete this bank because it has associated transactions')
      }

      const { error } = await supabase.from('accounts').delete().eq('id', id)
      if (error) throw error
      
      showToast('Bank deleted successfully', 'success')
      fetchAllData()
    } catch (error) { 
      showToast(error.message || 'Error deleting bank', 'error')
    }
  }

  // Category Actions
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
      if (existingCategory) {
        throw new Error('A category with this name already exists')
      }

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
      if (existingSub) {
        throw new Error('A subcategory with this name already exists under this category')
      }

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

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"? Any subcategories will also be deleted.`)) return
    
    try {
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id')
        .eq('category', name)
        .limit(1)
      
      if (txError) {
        console.error('Transaction check error:', txError)
      }
      
      if (transactions && transactions.length > 0) {
        throw new Error('Cannot delete this category because it has associated transactions')
      }

      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
      
      showToast('Category deleted successfully', 'success')
      fetchAllData()
    } catch (error) { 
      showToast(error.message || 'Error deleting category', 'error')
    }
  }

  // Get main categories
  const mainCategories = categories.filter(c => !c.parent_id)

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto scrollbar-hide">
        {/* ✅ Added scrollbar-hide class above */}
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Vault Settings</h2>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="flex gap-4 mb-6 border-b border-slate-100 pb-2">
          <button 
            onClick={() => setActiveTab('categories')} 
            className={`text-sm font-bold pb-2 transition-colors ${
              activeTab === 'categories' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Categories
          </button>
          <button 
            onClick={() => setActiveTab('nodes')} 
            className={`text-sm font-bold pb-2 transition-colors ${
              activeTab === 'nodes' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Nodes
          </button>
        </div>

        {activeTab === 'categories' ? (
          <div>
            <div className="space-y-4 mb-6">
              {mainCategories.map(main => (
                <div key={main.id} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex justify-between items-center p-3 bg-slate-100/50">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{main.name}</p>
                      {main.keywords && main.keywords.length > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          <Hash className="w-3 h-3 inline mr-1" />
                          {main.keywords.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => { 
                          setAddingSubToId(main.id); 
                          setNewSubCategoryName('')
                          setNewSubCategoryKeywords('')
                        }} 
                        className="text-blue-500 hover:text-blue-700 p-1.5 transition-colors"
                        title="Add subcategory"
                      >
                        <Plus className="w-4 h-4"/>
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(main.id, main.name)} 
                        className="text-red-400 hover:text-red-600 p-1.5 transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-2 space-y-1">
                    {getSubCategories(main.id).map(sub => (
                      <div key={sub.id} className="flex justify-between items-center pl-6 pr-2 py-1.5 hover:bg-white rounded-lg transition-colors">
                        <div>
                          <p className="text-xs text-slate-600 flex items-center gap-2">
                            <CornerDownRight className="w-3 h-3 text-slate-300"/> {sub.name}
                          </p>
                          {sub.keywords && sub.keywords.length > 0 && (
                            <p className="text-[10px] text-slate-400 pl-5">
                              {sub.keywords.join(', ')}
                            </p>
                          )}
                        </div>
                        <button 
                          onClick={() => handleDeleteCategory(sub.id, sub.name)} 
                          className="text-red-300 hover:text-red-500 transition-colors"
                          title="Delete subcategory"
                        >
                          <Trash2 className="w-3 h-3"/>
                        </button>
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
                          className="w-full bg-white border rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-500" 
                        />
                        <input 
                          type="text" 
                          value={newSubCategoryKeywords} 
                          onChange={(e) => setNewSubCategoryKeywords(e.target.value)} 
                          placeholder="Keywords (comma separated: lunch, nasi)" 
                          className="w-full bg-white border rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-500" 
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleAddSubCategory(main.id)} 
                            className="flex-1 bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                          >
                            Add Subcategory
                          </button>
                          <button 
                            onClick={() => {
                              setAddingSubToId(null)
                              setNewSubCategoryName('')
                              setNewSubCategoryKeywords('')
                            }} 
                            className="px-2 text-slate-400 hover:text-slate-600"
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

            <form onSubmit={handleAddMainCategory} className="border-t pt-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase">New Main Category</h3>
              <input 
                type="text" 
                required 
                value={newMainCategoryName} 
                onChange={(e) => setNewMainCategoryName(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                placeholder="Category name (e.g. Housing)" 
              />
              <input 
                type="text" 
                value={newMainCategoryKeywords} 
                onChange={(e) => setNewMainCategoryKeywords(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                placeholder="Keywords (comma separated: rent, mortgage, house)" 
              />
              <button 
                type="submit" 
                disabled={saving || !newMainCategoryName.trim()} 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Category
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="space-y-3 mb-6">
              {accounts.map(acc => {
                const classData = classifications.find(c => c.key_name === acc.classification)
                return (
                  <div key={acc.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{acc.account_name}</p>
                      <p className="text-xs text-slate-400 capitalize">{classData?.label || acc.classification}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteBank(acc.id, acc.account_name)} 
                      className="text-red-400 hover:text-red-600 p-2 transition-colors"
                      title="Delete bank"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                )
              })}
            </div>
            <form onSubmit={handleAddBank} className="border-t pt-4 space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase">Add New Node</h3>
              <input 
                type="text" 
                required 
                value={newBankName} 
                onChange={(e) => setNewBankName(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                placeholder="Bank Name (e.g. CIMB)" 
              />
              <select 
                value={newBankClass} 
                onChange={(e) => setNewBankClass(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {classifications.map(c => (
                  <option key={c.id} value={c.key_name}>{c.label}</option>
                ))}
              </select>
              <button 
                type="submit" 
                disabled={saving || !newBankName.trim()} 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Node
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}