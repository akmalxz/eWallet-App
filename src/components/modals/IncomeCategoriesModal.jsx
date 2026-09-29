// src/components/modals/IncomeCategoriesModal.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Plus, Trash2, CornerDownRight, Edit2, Save, X } from 'lucide-react'
import { ModalWrapper } from './ModalWrapper'

export const IncomeCategoriesModal = ({
  user,
  categories,
  closeModal,
  fetchAllData,
  showToast
}) => {
  const [newSubCategoryName, setNewSubCategoryName] = useState('')
  const [saving, setSaving] = useState(false)
  const [addingSubToId, setAddingSubToId] = useState(null)
  const [editingItemId, setEditingItemId] = useState(null)
  const [editValue, setEditValue] = useState('')

  // Computed
  const getSubCategories = (parentId) =>
    categories.filter(c => c.parent_id === parentId)

  const incomeCategory = categories
    .filter(c => !c.parent_id)
    .find(c => c.name.toLowerCase() === 'income')

  // ----------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------

  const handleAddMainCategory = async (e, forceName = null) => {
    if (e) e.preventDefault()

    const nameToSave = forceName

    if (!nameToSave) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ user_id: user.id, name: nameToSave }])

      if (error) throw error

      showToast(`${nameToSave} category added!`, 'success')
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
    <ModalWrapper title="Income Setup" closeModal={closeModal}>

      {!incomeCategory ? (

        <div className="text-center p-4">

          <p className="text-sm text-slate-500 mb-3">
            You don't have an Income category set up yet.
          </p>

          <button
            onClick={(e) => handleAddMainCategory(e, 'Income')}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold w-full transition-colors hover:bg-slate-800"
          >
            Create "Income" Category
          </button>

        </div>

      ) : (

        <div className="space-y-2">

          {/* Top Actions Row */}
          <button
            onClick={() => {
              setAddingSubToId(
                addingSubToId === incomeCategory.id
                  ? null
                  : incomeCategory.id
              )
              setNewSubCategoryName('')
              setEditingItemId(null)
            }}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm border ${
              addingSubToId === incomeCategory.id
                ? 'bg-slate-100 text-slate-700 border-slate-200'
                : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
            }`}
            aria-label="Add income stream"
          >
            {addingSubToId === incomeCategory.id
              ? <X className="w-3.5 h-3.5" />
              : <Plus className="w-3.5 h-3.5" />}
            {addingSubToId === incomeCategory.id ? 'Cancel' : 'Add New Income Category'}
          </button>

          {/* New Income Stream Inline Form */}
          {addingSubToId === incomeCategory.id && (
            <div className="flex gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl animate-fadeIn">
              <label htmlFor="income-subcat-name" className="sr-only">
                Income Subcategory Name
              </label>

              <input
                id="income-subcat-name"
                name="income-subcat-name"
                autoFocus
                type="text"
                value={newSubCategoryName}
                onChange={(e) => setNewSubCategoryName(e.target.value)}
                placeholder="e.g. Salary, Side Hustle"
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              />

              <button
                onClick={() => handleAddSubCategory(incomeCategory.id)}
                disabled={saving || !newSubCategoryName.trim()}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          )}


          {/* Existing subcategory list */}
          {getSubCategories(incomeCategory.id).map(sub => (

            <div
              key={sub.id}
              className="bg-white/50 p-3 rounded-xl border border-white/60 min-h-[48px]"
            >

              {editingItemId === sub.id ? (

                <div className="flex gap-2">

                  <input
                    aria-label="Edit Income Subcategory Name"
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1 text-sm outline-none focus:border-blue-500"
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

                  <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <CornerDownRight className="w-4 h-4 text-slate-300" />
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

        </div>

      )}

    </ModalWrapper>
  )
}