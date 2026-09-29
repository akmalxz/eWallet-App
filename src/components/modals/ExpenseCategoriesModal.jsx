// src/components/modals/ExpenseCategoriesModal.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Plus, Trash2, CornerDownRight, Edit2, Save, X, Download } from 'lucide-react'
import { ModalWrapper } from './ModalWrapper'

export const ExpenseCategoriesModal = ({
  user,
  categories,
  closeModal,
  fetchAllData,
  showToast
}) => {
  const [newMainCategoryName, setNewMainCategoryName] = useState('')
  const [newSubCategoryName, setNewSubCategoryName] = useState('')
  const [saving, setSaving] = useState(false)
  const [addingSubToId, setAddingSubToId] = useState(null)
  const [editingItemId, setEditingItemId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [showAddMaster, setShowAddMaster] = useState(false) // NEW STATE

  // ----------------------------------------------------------
  // Computed
  // ----------------------------------------------------------

  const getSubCategories = (parentId) =>
    categories.filter(c => c.parent_id === parentId)

  const expenseCategories = categories
    .filter(c => !c.parent_id)
    .filter(c => c.name.toLowerCase() !== 'income')

  // ----------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------

  const PREDEFINED_CATEGORIES = [
    'Food & Dining', 'Transport', 'Shopping', 'Bills & Utilities',
    'Health', 'Entertainment', 'Education', 'Gift', 'Groceries',
    'Rent', 'Subscription', 'Travel', 'Other'
  ]

  const handleImportPredefined = async () => {
    setSaving(true)
    try {
      // 1. Get a list of existing category names to prevent duplicates
      const existingNames = expenseCategories.map(c => c.name.toLowerCase())

      // 2. Filter the predefined list to only include new ones
      const categoriesToImport = PREDEFINED_CATEGORIES.filter(
        name => !existingNames.includes(name.toLowerCase())
      )

      if (categoriesToImport.length === 0) {
        showToast('All predefined categories have already been imported.', 'info')
        return
      }

      // 3. Format the array for a Supabase bulk insert
      const insertPayload = categoriesToImport.map(name => ({
        user_id: user.id,
        name: name
      }))

      // 4. Execute bulk insert
      const { error } = await supabase.from('categories').insert(insertPayload)
      if (error) throw error

      showToast(`Imported ${categoriesToImport.length} new categories!`, 'success')
      fetchAllData()
    } catch (error) {
      showToast('Error importing categories: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddMainCategory = async (e) => {
    e.preventDefault()

    if (!newMainCategoryName.trim()) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from('categories')
        .insert([
          {
            user_id: user.id,
            name: newMainCategoryName.trim()
          }
        ])

      if (error) throw error

      setNewMainCategoryName('')

      showToast('Category added!', 'success')
      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSubCategory = async (parentId) => {
    if (!newSubCategoryName.trim()) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from('categories')
        .insert([
          {
            user_id: user.id,
            name: newSubCategoryName.trim(),
            parent_id: parentId
          }
        ])

      if (error) throw error

      setNewSubCategoryName('')
      setAddingSubToId(null)

      showToast('Subcategory added!', 'success')
      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (id, name) => {
    if (
      !window.confirm(
        `Delete category "${name}"? Subcategories will also be deleted.`
      )
    ) {
      return
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error

      showToast('Category deleted', 'success')
      fetchAllData()
    } catch (error) {
      showToast('Cannot delete category. It has transactions.', 'error')
    }
  }

  const handleUpdateCategory = async (id) => {
    if (!editValue.trim()) {
      return setEditingItemId(null)
    }

    setSaving(true)

    try {
      const { data, error } = await supabase
        .from('categories')
        .update({ name: editValue.trim() })
        .eq('id', id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error(
          'Update failed — no rows affected. Your RLS policy may not allow UPDATE on categories.'
        )
      }

      showToast('Category updated successfully', 'success')
      await fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
      setEditingItemId(null)
    }
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <ModalWrapper title="Expense Setup" closeModal={closeModal}>

      <div className="space-y-4">

        {/* Top Actions Row */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleImportPredefined}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {saving ? 'Importing...' : 'Import Predefined'}
          </button>

          <button
            onClick={() => setShowAddMaster(!showAddMaster)}
            className={`flex items-center justify-center p-2.5 rounded-xl transition-colors shadow-sm border ${
              showAddMaster
                ? 'bg-slate-100 text-slate-700 border-slate-200'
                : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
            }`}
            aria-label="Add new master category"
          >
            {showAddMaster ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        {/* New Master Category Inline Form */}
        {showAddMaster && (
          <form
            onSubmit={(e) => {
              handleAddMainCategory(e);
              setShowAddMaster(false); // Auto-hide after successful add
            }}
            className="flex gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl animate-fadeIn"
          >
            <label htmlFor="new-master-category" className="sr-only">
              Category Name
            </label>
            <input
              id="new-master-category"
              autoFocus
              type="text"
              required
              value={newMainCategoryName}
              onChange={(e) => setNewMainCategoryName(e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="e.g. Housing, Transportation"
            />
            <button
              type="submit"
              disabled={saving || !newMainCategoryName.trim()}
              className="bg-slate-900 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        )}


        {/* Existing mapped categories... */}
        {expenseCategories.map(main => (

          <div
            key={main.id}
            className="bg-white/40 border border-white/60 rounded-xl overflow-hidden"
          >

            {/* Main Category Header */}

            <div className="flex justify-between items-center p-3 bg-white/50 min-h-[52px]">

              {editingItemId === main.id ? (

                <div className="flex gap-2 w-full">

                  <input
                    aria-label="Edit Master Expense Category Name"
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                  />

                  <div className="flex flex-col gap-1 shrink-0">

                    <button
                      onClick={() => handleUpdateCategory(main.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200"
                      aria-label="Save category"
                    >
                      <Save className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => setEditingItemId(null)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 text-slate-600 transition-colors hover:bg-slate-300"
                      aria-label="Cancel editing"
                    >
                      <X className="h-4 w-4" />
                    </button>

                  </div>

                </div>

              ) : (

                <>
                  <p className="text-sm font-bold text-slate-800">
                    {main.name}
                  </p>

                  <div className="flex items-center gap-1">

                    <button
                      onClick={() => {
                        setAddingSubToId(main.id)
                        setNewSubCategoryName('')
                        setEditingItemId(null)
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
                      aria-label={`Add subcategory to ${main.name}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => {
                        setEditingItemId(main.id)
                        setEditValue(main.name)
                        setAddingSubToId(null)
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                      aria-label={`Edit ${main.name}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteCategory(main.id, main.name)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${main.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                  </div>
                </>

              )}

            </div>


            {/* Subcategories */}

            <div className="p-2 space-y-1">

              {getSubCategories(main.id).map(sub => (

                <div
                  key={sub.id}
                  className="pl-6 pr-2 py-1.5 hover:bg-white/60 rounded-lg min-h-[40px]"
                >

                  {editingItemId === sub.id ? (

                    <div className="flex gap-2">

                      <input
                        aria-label="Edit Expense Subcategory Name"
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none focus:border-blue-500"
                      />

                      <div className="flex flex-col gap-1 shrink-0">

                        <button
                          onClick={() => handleUpdateCategory(sub.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200"
                          aria-label="Save category"
                        >
                          <Save className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => setEditingItemId(null)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 text-slate-600 transition-colors hover:bg-slate-300"
                          aria-label="Cancel editing"
                        >
                          <X className="h-4 w-4" />
                        </button>

                      </div>

                    </div>

                  ) : (

                    <div className="flex justify-between items-center">

                      <p className="text-xs font-medium text-slate-600 flex items-center gap-2">
                        <CornerDownRight className="h-3 w-3 text-slate-300" />
                        {sub.name}
                      </p>

                      <div className="flex items-center gap-1">

                        <button
                          onClick={() => {
                            setEditingItemId(sub.id)
                            setEditValue(sub.name)
                            setAddingSubToId(null)
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500"
                          aria-label={`Edit ${sub.name}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteCategory(sub.id, sub.name)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-red-300 transition-colors hover:bg-red-50 hover:text-red-500"
                          aria-label={`Delete ${sub.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                      </div>

                    </div>

                  )}

                </div>

              ))}


              {/* Add Subcategory */}

              {addingSubToId === main.id && (

                <div className="pl-6 pr-2 py-2 flex gap-2">

                  <label
                    htmlFor={`expense-subcat-${main.id}`}
                    className="sr-only"
                  >
                    Expense Subcategory Name
                  </label>

                  <input
                    id={`expense-subcat-${main.id}`}
                    name={`expense-subcat-${main.id}`}
                    autoFocus
                    type="text"
                    value={newSubCategoryName}
                    onChange={(e) => setNewSubCategoryName(e.target.value)}
                    placeholder="Subcategory..."
                    className="flex-1 bg-white/80 border border-white/60 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                  />

                  <button
                    onClick={() => handleAddSubCategory(main.id)}
                    className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-slate-800"
                  >
                    Save
                  </button>

                </div>

              )}

            </div>

          </div>

        ))}

      </div>

    </ModalWrapper>
  )
}