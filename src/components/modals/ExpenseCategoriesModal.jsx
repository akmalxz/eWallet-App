// src/components/modals/ExpenseCategoriesModal.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Plus, Trash2, CornerDownRight, Edit2, Save, X, Download } from 'lucide-react'
import { ModalWrapper } from './ModalWrapper'
import { ConfirmSheet } from '../shared/ConfirmSheet'

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
  const [showAddMaster, setShowAddMaster] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)

  const getSubCategories = (parentId) =>
    categories.filter((c) => c.parent_id === parentId)

  const expenseCategories = categories
    .filter((c) => !c.parent_id)
    .filter((c) => c.name.toLowerCase() !== 'income')

  const PREDEFINED_CATEGORIES = [
    'Food & Dining', 'Transport', 'Shopping', 'Bills & Utilities',
    'Health', 'Entertainment', 'Education', 'Gift', 'Groceries',
    'Rent', 'Subscription', 'Travel', 'Other'
  ]

  const handleImportPredefined = async () => {
    setSaving(true)
    try {
      const existingNames = expenseCategories.map((c) => c.name.toLowerCase())
      const categoriesToImport = PREDEFINED_CATEGORIES.filter(
        (name) => !existingNames.includes(name.toLowerCase())
      )

      if (categoriesToImport.length === 0) {
        showToast('All predefined categories have already been imported.', 'info')
        return
      }

      const insertPayload = categoriesToImport.map((name) => ({
        user_id: user.id,
        name
      }))

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
        .insert([{ user_id: user.id, name: newMainCategoryName.trim() }])
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

  const requestDeleteCategory = (id, name) => setPendingDelete({ id, name })

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
      <ModalWrapper title="Expense Setup" closeModal={closeModal}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleImportPredefined}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-surface border border-line text-fg hover:bg-surface-2 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
              style={{ minHeight: 44 }}
            >
              <Download className="w-3.5 h-3.5" />
              {saving ? 'Importing...' : 'Import Predefined'}
            </button>

            <button
              onClick={() => setShowAddMaster(!showAddMaster)}
              className={`flex items-center justify-center w-11 h-11 rounded-xl transition-colors shadow-sm border ${
                showAddMaster
                  ? 'bg-surface-2 text-fg-muted border-line'
                  : 'bg-brand-solid text-white border-brand-solid hover:bg-brand-solid-hover'
              }`}
              aria-label="Add new master category"
            >
              {showAddMaster ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>

          {showAddMaster && (
            <form
              onSubmit={(e) => {
                handleAddMainCategory(e)
                setShowAddMaster(false)
              }}
              className="flex gap-2 p-3 bg-surface-2 border border-line rounded-xl animate-fadeIn"
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
                className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand"
                placeholder="e.g. Housing, Transportation"
              />
              <button
                type="submit"
                disabled={saving || !newMainCategoryName.trim()}
                className="bg-brand-solid hover:bg-brand-solid-hover text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </form>
          )}

          {expenseCategories.map((main) => (
            <div
              key={main.id}
              className="bg-surface border border-line rounded-xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-3 bg-surface-2 min-h-[52px]">
                {editingItemId === main.id ? (
                  <div className="flex gap-2 w-full">
                    <input
                      aria-label="Edit Master Expense Category Name"
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 bg-surface border border-line rounded-lg px-2 py-1.5 text-sm text-fg outline-none focus:border-brand"
                    />
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => handleUpdateCategory(main.id)}
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
                  <>
                    <p className="text-sm font-bold text-fg">{main.name}</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setAddingSubToId(main.id)
                          setNewSubCategoryName('')
                          setEditingItemId(null)
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-brand transition-colors hover:bg-brand-soft"
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
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-brand-soft hover:text-brand"
                        aria-label={`Edit ${main.name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => requestDeleteCategory(main.id, main.name)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-danger/70 transition-colors hover:bg-danger-soft hover:text-danger"
                        aria-label={`Delete ${main.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="p-2 space-y-1">
                {getSubCategories(main.id).map((sub) => (
                  <div
                    key={sub.id}
                    className="pl-6 pr-2 py-1.5 hover:bg-surface-2/60 rounded-lg min-h-[40px]"
                  >
                    {editingItemId === sub.id ? (
                      <div className="flex gap-2">
                        <input
                          aria-label="Edit Expense Subcategory Name"
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 bg-surface border border-line rounded-md px-2 py-1 text-xs text-fg outline-none focus:border-brand"
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
                        <p className="text-xs font-medium text-fg-muted flex items-center gap-2">
                          <CornerDownRight className="h-3 w-3 text-fg-subtle" />
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

                {addingSubToId === main.id && (
                  <div className="pl-6 pr-2 py-2 flex gap-2">
                    <label htmlFor={`expense-subcat-${main.id}`} className="sr-only">
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
                      className="flex-1 bg-surface border border-line rounded-lg px-2 py-1.5 text-xs text-fg placeholder:text-fg-subtle outline-none focus:border-brand"
                    />
                    <button
                      onClick={() => handleAddSubCategory(main.id)}
                      className="bg-brand-solid hover:bg-brand-solid-hover text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
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