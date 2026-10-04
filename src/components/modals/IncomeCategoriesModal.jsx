// src/components/modals/IncomeCategoriesModal.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Plus, Trash2, CornerDownRight, Edit2, Save, X } from 'lucide-react'
import { ModalWrapper } from './ModalWrapper'
import { ConfirmSheet } from '../shared/ConfirmSheet'

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
  const [pendingDelete, setPendingDelete] = useState(null)

  const getSubCategories = (parentId) =>
    categories.filter((c) => c.parent_id === parentId)

  const incomeCategory = categories
    .filter((c) => !c.parent_id)
    .find((c) => c.name.toLowerCase() === 'income')

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
          { user_id: user.id, name: newSubCategoryName.trim(), parent_id: parentId }
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

  const requestDeleteCategory = (id, name) => {
    setPendingDelete({ id, name })
  }

  const confirmDeleteCategory = async () => {
    if (!pendingDelete) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', pendingDelete.id)
      if (error) throw error
      showToast('Category deleted', 'success')
      setPendingDelete(null)
      fetchAllData()
    } catch (error) {
      showToast('Cannot delete category. It has transactions.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCategory = async (id) => {
    if (!editValue.trim()) return setEditingItemId(null)
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

  return (
    <>
      <ModalWrapper title="Income Setup" closeModal={closeModal}>
        {!incomeCategory ? (
          <div className="text-center p-4">
            <p className="text-sm text-fg-muted mb-3">
              You don't have an Income category set up yet.
            </p>
            <button
              onClick={(e) => handleAddMainCategory(e, 'Income')}
              className="bg-brand-solid hover:bg-brand-solid-hover text-white px-4 py-2 rounded-xl text-sm font-bold w-full transition-colors"
              style={{ minHeight: 44 }}
            >
              Create "Income" Category
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => {
                setAddingSubToId(
                  addingSubToId === incomeCategory.id ? null : incomeCategory.id
                )
                setNewSubCategoryName('')
                setEditingItemId(null)
              }}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm border ${
                addingSubToId === incomeCategory.id
                  ? 'bg-surface-2 text-fg-muted border-line'
                  : 'bg-brand-solid text-white border-brand-solid hover:bg-brand-solid-hover'
              }`}
              aria-label="Add income stream"
              style={{ minHeight: 44 }}
            >
              {addingSubToId === incomeCategory.id ? (
                <X className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {addingSubToId === incomeCategory.id ? 'Cancel' : 'Add New Income Category'}
            </button>

            {addingSubToId === incomeCategory.id && (
              <div className="flex gap-2 p-3 bg-surface-2 border border-line rounded-xl animate-fadeIn">
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
                  className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand"
                />
                <button
                  onClick={() => handleAddSubCategory(incomeCategory.id)}
                  disabled={saving || !newSubCategoryName.trim()}
                  className="bg-brand-solid hover:bg-brand-solid-hover text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            )}

            {getSubCategories(incomeCategory.id).map((sub) => (
              <div
                key={sub.id}
                className="bg-surface-2 p-3 rounded-xl border border-line min-h-[48px]"
              >
                {editingItemId === sub.id ? (
                  <div className="flex gap-2">
                    <input
                      aria-label="Edit Income Subcategory Name"
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 bg-surface border border-line rounded-md px-2 py-1 text-sm text-fg outline-none focus:border-brand"
                    />
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => handleUpdateCategory(sub.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-success-soft text-success-text transition-colors hover:bg-success/20"
                        aria-label="Save category"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingItemId(null)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-surface-3 text-fg-muted transition-colors hover:bg-line-strong"
                        aria-label="Cancel editing"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-fg flex items-center gap-2">
                      <CornerDownRight className="w-4 h-4 text-fg-subtle" />
                      {sub.name}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingItemId(sub.id)
                          setEditValue(sub.name)
                          setAddingSubToId(null)
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-brand-soft hover:text-brand"
                        aria-label={`Edit ${sub.name}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => requestDeleteCategory(sub.id, sub.name)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-danger/70 transition-colors hover:bg-danger-soft hover:text-danger"
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

      {pendingDelete && (
        <ConfirmSheet
          destructive
          saving={saving}
          title={`Delete "${pendingDelete.name}"?`}
          message="Subcategories will also be deleted. This can't be undone."
          confirmLabel="Delete"
          onConfirm={confirmDeleteCategory}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  )
}