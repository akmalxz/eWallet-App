// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  User, LogOut, Plus, Trash2, CornerDownRight, CheckCircle, PauseCircle, Target,
  Building2, TrendingUp, TrendingDown, ChevronRight, X, Zap,
  Copy, RefreshCw, AlertTriangle, Edit2,Save
} from 'lucide-react'

import { formatMYR } from '../utils/formatters'


// ============================================================
// MODAL WRAPPER
// ============================================================

const ModalWrapper = ({ title, closeModal, children }) => (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
    <div className="bg-white/90 backdrop-blur-xl border border-white/50 rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">

      {/* Modal Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-lg font-bold text-slate-900">
          {title}
        </h2>

        <button
          onClick={closeModal}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Modal Content */}
      <div className="overflow-y-auto flex-1 pr-2 scrollbar-hide space-y-6">
        {children}
      </div>
    </div>
  </div>
)


// ============================================================
// SETUP BUTTON
// ============================================================

const SetupButton = ({
  id,
  title,
  icon: Icon,
  activeModal,
  openModal
}) => {
  const isThisActive = activeModal === id

  return (
    <button
      onClick={() => openModal(id)}
      className={`w-full bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl p-5 mb-4 flex items-center justify-between transition-all duration-300 shadow-sm outline-none group ${
        isThisActive
          ? 'ring-2 ring-slate-900 shadow-md scale-[1.01]'
          : 'hover:bg-white hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <div className="flex items-center gap-4">

        <div
          className={`p-2.5 rounded-xl transition-colors duration-300 ${
            isThisActive
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <span
          className={`font-bold text-base transition-colors ${
            isThisActive
              ? 'text-slate-900'
              : 'text-slate-800'
          }`}
        >
          {title}
        </span>
      </div>

      <ChevronRight
        className={`w-5 h-5 transition-transform duration-300 ${
          isThisActive
            ? 'text-slate-900 rotate-90'
            : 'text-slate-400 group-hover:translate-x-1'
        }`}
      />
    </button>
  )
}


// ============================================================
// PROFILE PAGE
// ============================================================

export function ProfilePage({
  user,
  accounts,
  categories,
  getSubCategories,
  classifications,
  commitments = [],
  fetchAllData,
  showToast,
  initialModal = null
}) {

  const [activeModal, setActiveModal] = useState(initialModal)

  // ----------------------------------------------------------
  // Sync initial modal
  // ----------------------------------------------------------

  useEffect(() => {
    if (initialModal) {
      setActiveModal(initialModal)
    }
  }, [initialModal])


  // ----------------------------------------------------------
  // Form States
  // ----------------------------------------------------------

  const [newBankName, setNewBankName] = useState('')
  const [newBankClass, setNewBankClass] = useState(
    classifications[0]?.key_name || 'hub'
  )
  const [newBankColor, setNewBankColor] = useState('blue')

  const [newMainCategoryName, setNewMainCategoryName] = useState('')
  const [addingSubToId, setAddingSubToId] = useState(null)
  const [newSubCategoryName, setNewSubCategoryName] = useState('')

  const [newCommitmentName, setNewCommitmentName] = useState('')
  const [newCommitmentAmount, setNewCommitmentAmount] = useState('')
  const [newCommitmentDueDay, setNewCommitmentDueDay] = useState('')
  const [newCommitmentAccount, setNewCommitmentAccount] = useState('')

  const [saving, setSaving] = useState(false)

  // ----------------------------------------------------------
  // Edit State
  // ----------------------------------------------------------

  const [editingItemId, setEditingItemId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editColor, setEditColor] = useState('blue')


  // ----------------------------------------------------------
  // Computed Categories
  // ----------------------------------------------------------

  const mainCategories = categories.filter(c => !c.parent_id)

  const incomeCategory = mainCategories.find(
    c => c.name.toLowerCase() === 'income'
  )

  const expenseCategories = mainCategories.filter(
    c => c.name.toLowerCase() !== 'income'
  )


  // ----------------------------------------------------------
  // Modal Controls
  // ----------------------------------------------------------

  const openModal = (section) => {
    setActiveModal(section)
    setAddingSubToId(null)
    setEditingItemId(null)
  }

  const closeModal = () => {
    setActiveModal(null)
    setAddingSubToId(null)
    setEditingItemId(null)
  }


  // ============================================================
  // WEBHOOK KEY
  // ============================================================

  const [webhookKey, setWebhookKey] = useState('')

  const fetchWebhookKey = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_keys')
        .select('key')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setWebhookKey(data.key)
      }
    } catch (error) {
      console.log('No key found yet')
    }
  }


  const generateWebhookKey = async () => {
    setSaving(true)

    const newKey =
      'fs_live_' +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)

    try {
      const { error } = await supabase
        .from('webhook_keys')
        .upsert({
          user_id: user.id,
          key: newKey
        })

      if (error) throw error

      setWebhookKey(newKey)

      showToast(
        'New secret key generated!',
        'success'
      )
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }


  const copyToClipboard = () => {
    navigator.clipboard.writeText(user.id)
    showToast('User ID copied to clipboard!', 'success')
  }

  const handleOpenApiModal = () => {
    openModal('api')
  }


  // ============================================================
  // BANK HANDLERS
  // ============================================================

  const handleAddBank = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('accounts')
        .insert([
          {
            user_id: user.id,
            account_name: newBankName.trim(),
            classification: newBankClass,
            color_theme: newBankColor
          }
        ])

      if (error) throw error

      setNewBankName('')

      showToast(
        'Bank added successfully!',
        'success'
      )

      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }


  const handleDeleteBank = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)

      if (error) throw error

      showToast('Bank deleted', 'success')

      fetchAllData()
    } catch (error) {
      showToast(
        'Cannot delete this bank. It has transactions.',
        'error'
      )
    }
  }


  const handleUpdateBank = async (id) => {
    if (!editValue.trim()) {
      return setEditingItemId(null)
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          account_name: editValue.trim(),
          color_theme: editColor
        })
        .eq('id', id)

      if (error) throw error

      showToast(
        'Bank updated successfully',
        'success'
      )

      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
      setEditingItemId(null)
    }
  }


  // ============================================================
  // CATEGORY HANDLERS
  // ============================================================

  const handleAddMainCategory = async (
    e,
    forceName = null
  ) => {

    if (e) e.preventDefault()

    const nameToSave =
      forceName ||
      newMainCategoryName.trim()

    if (!nameToSave) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from('categories')
        .insert([
          {
            user_id: user.id,
            name: nameToSave
          }
        ])

      if (error) throw error

      setNewMainCategoryName('')

      showToast(
        `${nameToSave} category added!`,
        'success'
      )

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

      showToast(
        'Subcategory added!',
        'success'
      )

      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }


  const handleDeleteCategory = async (
    id,
    name
  ) => {

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

      showToast(
        'Category deleted',
        'success'
      )

      fetchAllData()
    } catch (error) {
      showToast(
        'Cannot delete category. It has transactions.',
        'error'
      )
    }
  }


  const handleUpdateCategory = async (id) => {

    if (!editValue.trim()) {
      return setEditingItemId(null)
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: editValue.trim()
        })
        .eq('id', id)

      if (error) throw error

      showToast(
        'Category updated successfully',
        'success'
      )

      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
      setEditingItemId(null)
    }
  }


  // ============================================================
  // COMMITMENT HANDLERS
  // ============================================================

  const handleAddCommitment = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('commitments')
        .insert([
          {
            user_id: user.id,
            name: newCommitmentName.trim(),
            amount: parseFloat(newCommitmentAmount),
            due_day_of_month: parseInt(newCommitmentDueDay),
            account_id: newCommitmentAccount,
            is_active: true
          }
        ])

      if (error) throw error

      setNewCommitmentName('')
      setNewCommitmentAmount('')
      setNewCommitmentDueDay('')
      setNewCommitmentAccount('')

      showToast(
        'Commitment added!',
        'success'
      )

      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }


  const handleDeleteCommitment = async (
    id,
    name
  ) => {

    if (
      !window.confirm(
        `Delete commitment "${name}"?`
      )
    ) {
      return
    }

    try {
      const { error } = await supabase
        .from('commitments')
        .delete()
        .eq('id', id)

      if (error) throw error

      showToast(
        'Commitment deleted',
        'success'
      )

      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    }
  }


  const handleToggleCommitment = async (
    id,
    isActive
  ) => {

    try {
      const { error } = await supabase
        .from('commitments')
        .update({
          is_active: !isActive
        })
        .eq('id', id)

      if (error) throw error

      fetchAllData()
    } catch (error) {
      showToast(error.message, 'error')
    }
  }


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* ======================================================
          PROFILE HEADER
      ====================================================== */}

      <div className="bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-3xl shadow-sm flex items-center gap-4 mb-8">

        <div className="bg-slate-900 p-4 rounded-full text-white">
          <User className="w-8 h-8" />
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">
            Your Vault
          </h2>

          <p className="text-xs text-slate-500">
            {user?.email}
          </p>
        </div>

        <button
          onClick={() => supabase.auth.signOut()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50/80 text-red-500 transition-colors hover:bg-red-100 hover:text-red-600"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>

      </div>


      {/* ======================================================
          SETUP BUTTONS
      ====================================================== */}

      <div className="space-y-4">

        <SetupButton
          id="banks"
          title="Bank Accounts"
          icon={Building2}
          activeModal={activeModal}
          openModal={openModal}
        />

        <SetupButton
          id="income"
          title="Income Categories"
          icon={TrendingUp}
          activeModal={activeModal}
          openModal={openModal}
        />

        <SetupButton
          id="expense"
          title="Expense Categories"
          icon={TrendingDown}
          activeModal={activeModal}
          openModal={openModal}
        />

        <SetupButton
          id="commitments"
          title="Monthly Commitments"
          icon={Target}
          activeModal={activeModal}
          openModal={openModal}
        />

        <SetupButton
          id="api"
          title="Automation & Shortcuts"
          icon={Zap}
          activeModal={activeModal}
          openModal={handleOpenApiModal}
        />

      </div>


      {/* ======================================================
          BANK ACCOUNTS MODAL
      ====================================================== */}

      {activeModal === 'banks' && (
        <ModalWrapper
          title="Bank Accounts"
          closeModal={closeModal}
        >

          <div className="space-y-3">

            {accounts.map(acc => (

              <div
                key={acc.id}
                className="bg-white/50 p-3 rounded-xl border border-white/60"
              >

                {editingItemId === acc.id ? (

                  <div className="flex gap-2">

                    <div className="flex-1 space-y-2">

                      <input
                        aria-label="Edit Bank Name"
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) =>
                          setEditValue(e.target.value)
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-sm outline-none focus:border-blue-500"
                      />

                      <select
                        aria-label="Edit Bank Color"
                        value={editColor}
                        onChange={(e) =>
                          setEditColor(e.target.value)
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs outline-none focus:border-blue-500"
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

                      <button
                        onClick={() =>
                          handleUpdateBank(acc.id)
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200"
                        aria-label="Save bank"
                      >
                        <Save className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() =>
                          setEditingItemId(null)
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 text-slate-600 transition-colors hover:bg-slate-300"
                        aria-label="Cancel editing"
                      >
                        <X className="h-4 w-4" />
                      </button>

                    </div>

                  </div>

                ) : (

                  <div className="flex justify-between items-center">

                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {acc.account_name}
                      </p>

                      <p className="text-xs text-slate-400 capitalize">
                        {
                          classifications.find(
                            c =>
                              c.key_name ===
                              acc.classification
                          )?.label ||
                          acc.classification
                        }
                      </p>
                    </div>

                    <div className="flex items-center gap-1">

                      <button
                        onClick={() => {
                          setEditingItemId(acc.id)
                          setEditValue(acc.account_name)
                          setEditColor(
                            acc.color_theme || 'slate'
                          )
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        aria-label={`Edit ${acc.account_name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() =>
                          handleDeleteBank(
                            acc.id,
                            acc.account_name
                          )
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${acc.account_name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>

                  </div>

                )}

              </div>

            ))}

          </div>


          {/* Add Bank */}

          <form
            onSubmit={handleAddBank}
            className="border-t border-slate-200/50 pt-6 space-y-3"
          >

            <h3 className="text-xs font-bold text-slate-500 uppercase">
              Add New Account
            </h3>

            <input
              type="text"
              required
              value={newBankName}
              onChange={(e) =>
                setNewBankName(e.target.value)
              }
              className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Bank Name (e.g. Maybank)"
            />

            <select
              value={newBankClass}
              onChange={(e) =>
                setNewBankClass(e.target.value)
              }
              className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {classifications.map(c => (
                <option
                  key={c.id}
                  value={c.key_name}
                >
                  {c.label}
                </option>
              ))}
            </select>

            <label
              htmlFor="new-bank-color"
              className="sr-only"
            >
              Account Color Theme
            </label>

            <select
              id="new-bank-color"
              name="new-bank-color"
              value={newBankColor}
              onChange={(e) =>
                setNewBankColor(e.target.value)
              }
              className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="blue">Blue</option>
              <option value="emerald">Green</option>
              <option value="purple">Purple</option>
              <option value="rose">Red</option>
              <option value="amber">Yellow</option>
              <option value="slate">Dark Grey</option>
            </select>

            <button
              type="submit"
              disabled={saving || !newBankName}
              className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl text-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              Save Account
            </button>

          </form>

        </ModalWrapper>
      )}


      {/* ======================================================
          INCOME MODAL
      ====================================================== */}

      {activeModal === 'income' && (
        <ModalWrapper
          title="Income Setup"
          closeModal={closeModal}
        >

          {!incomeCategory ? (

            <div className="text-center p-4">

              <p className="text-sm text-slate-500 mb-3">
                You don't have an Income category set up yet.
              </p>

              <button
                onClick={(e) =>
                  handleAddMainCategory(e, 'Income')
                }
                className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold w-full transition-colors hover:bg-slate-800"
              >
                Create "Income" Category
              </button>

            </div>

          ) : (

            <div className="space-y-2">

              {getSubCategories(
                incomeCategory.id
              ).map(sub => (

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
                        onChange={(e) =>
                          setEditValue(e.target.value)
                        }
                        className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1 text-sm outline-none focus:border-blue-500"
                      />

                      <div className="flex flex-col gap-1 shrink-0">

                        <button
                          onClick={() =>
                            handleUpdateCategory(sub.id)
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200"
                          aria-label="Save category"
                        >
                          <Save className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() =>
                            setEditingItemId(null)
                          }
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
                          onClick={() =>
                            handleDeleteCategory(
                              sub.id,
                              sub.name
                            )
                          }
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


              {/* Add Income Stream */}

              {addingSubToId === incomeCategory.id ? (

                <div className="flex gap-2 pt-4">

                  <label
                    htmlFor="income-subcat-name"
                    className="sr-only"
                  >
                    Income Subcategory Name
                  </label>

                  <input
                    id="income-subcat-name"
                    name="income-subcat-name"
                    autoFocus
                    type="text"
                    value={newSubCategoryName}
                    onChange={(e) =>
                      setNewSubCategoryName(e.target.value)
                    }
                    placeholder="e.g. Salary, Side Hustle"
                    className="flex-1 bg-white/60 border border-white/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />

                  <button
                    onClick={() =>
                      handleAddSubCategory(
                        incomeCategory.id
                      )
                    }
                    className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors hover:bg-slate-800"
                  >
                    Save
                  </button>

                </div>

              ) : (

                <button
                  onClick={() => {
                    setAddingSubToId(
                      incomeCategory.id
                    )
                    setNewSubCategoryName('')
                  }}
                  className="w-full flex justify-center items-center gap-2 bg-slate-100 text-slate-900 py-3 rounded-xl text-sm font-bold mt-4 transition-colors hover:bg-slate-200"
                >
                  <Plus className="h-4 w-4" />
                  Add Income Stream
                </button>

              )}

            </div>

          )}

        </ModalWrapper>
      )}


      {/* ======================================================
          EXPENSE MODAL
      ====================================================== */}

      {activeModal === 'expense' && (
        <ModalWrapper
          title="Expense Setup"
          closeModal={closeModal}
        >

          <div className="space-y-4">

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
                        onChange={(e) =>
                          setEditValue(e.target.value)
                        }
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                      />

                      <div className="flex flex-col gap-1 shrink-0">

                        <button
                          onClick={() =>
                            handleUpdateCategory(main.id)
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200"
                          aria-label="Save category"
                        >
                          <Save className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() =>
                            setEditingItemId(null)
                          }
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
                          onClick={() =>
                            handleDeleteCategory(
                              main.id,
                              main.name
                            )
                          }
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
                            onChange={(e) =>
                              setEditValue(e.target.value)
                            }
                            className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none focus:border-blue-500"
                          />

                          <div className="flex flex-col gap-1 shrink-0">

                            <button
                              onClick={() =>
                                handleUpdateCategory(sub.id)
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200"
                              aria-label="Save category"
                            >
                              <Save className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() =>
                                setEditingItemId(null)
                              }
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
                              onClick={() =>
                                handleDeleteCategory(
                                  sub.id,
                                  sub.name
                                )
                              }
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
                        onChange={(e) =>
                          setNewSubCategoryName(e.target.value)
                        }
                        placeholder="Subcategory..."
                        className="flex-1 bg-white/80 border border-white/60 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                      />

                      <button
                        onClick={() =>
                          handleAddSubCategory(main.id)
                        }
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


          {/* Add Master Category */}

          <form
            onSubmit={handleAddMainCategory}
            className="border-t border-slate-200/50 pt-6 space-y-3"
          >

            <h3 className="text-xs font-bold text-slate-500 uppercase">
              New Master Expense Category
            </h3>

            <div className="flex gap-2">

              <label
                htmlFor="new-master-category"
                className="sr-only"
              >
                Category Name
              </label>

              <input
                id="new-master-category"
                name="new-master-category"
                type="text"
                required
                value={newMainCategoryName}
                onChange={(e) =>
                  setNewMainCategoryName(e.target.value)
                }
                className="flex-1 bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Housing, Transportation"
              />

              <button
                type="submit"
                disabled={
                  saving ||
                  !newMainCategoryName
                }
                className="bg-slate-900 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                Add
              </button>

            </div>

          </form>

        </ModalWrapper>
      )}


      {/* ======================================================
          COMMITMENTS MODAL
      ====================================================== */}

      {activeModal === 'commitments' && (
        <ModalWrapper
          title="Commitments"
          closeModal={closeModal}
        >

          <div className="space-y-3">

            {commitments.length === 0 ? (

              <p className="text-sm text-slate-500 text-center py-4">
                No fixed commitments tracked yet.
              </p>

            ) : (

              commitments.map(comm => (

                <div
                  key={comm.id}
                  className={`flex justify-between items-center p-3 rounded-xl border ${
                    comm.is_active
                      ? 'bg-white/50 border-white/60'
                      : 'bg-slate-50/30 border-white/20 opacity-60'
                  }`}
                >

                  <div>

                    <p className="text-sm font-bold text-slate-800">
                      {comm.name}
                    </p>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatMYR(comm.amount)} on day{' '}
                      {comm.due_day_of_month}
                    </p>

                  </div>


                  <div className="flex items-center gap-1">

                    <button
                      onClick={() =>
                        handleToggleCommitment(
                          comm.id,
                          comm.is_active
                        )
                      }
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        comm.is_active
                          ? 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600'
                          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                      }`}
                      title={
                        comm.is_active
                          ? 'Deactivate'
                          : 'Activate'
                      }
                      aria-label={
                        comm.is_active
                          ? 'Deactivate commitment'
                          : 'Activate commitment'
                      }
                    >
                      {comm.is_active ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <PauseCircle className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      onClick={() =>
                        handleDeleteCommitment(
                          comm.id,
                          comm.name
                        )
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${comm.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                  </div>

                </div>

              ))

            )}

          </div>


          {/* Add Commitment */}

          <form
            onSubmit={handleAddCommitment}
            className="border-t border-slate-200/50 pt-6 space-y-3"
          >

            <h3 className="text-xs font-bold text-slate-500 uppercase">
              Add New Commitment
            </h3>

            <label
              htmlFor="comm-name"
              className="sr-only"
            >
              Commitment Name
            </label>

            <input
              id="comm-name"
              name="comm-name"
              type="text"
              required
              value={newCommitmentName}
              onChange={(e) =>
                setNewCommitmentName(e.target.value)
              }
              className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Netflix, Rent"
            />


            <div className="grid grid-cols-2 gap-3">

              <div>

                <label
                  htmlFor="comm-amount"
                  className="sr-only"
                >
                  Amount
                </label>

                <input
                  id="comm-amount"
                  name="comm-amount"
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={newCommitmentAmount}
                  onChange={(e) =>
                    setNewCommitmentAmount(e.target.value)
                  }
                  className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Amount"
                />

              </div>


              <div>

                <label
                  htmlFor="comm-day"
                  className="sr-only"
                >
                  Due Day
                </label>

                <input
                  id="comm-day"
                  name="comm-day"
                  type="number"
                  required
                  min="1"
                  max="31"
                  value={newCommitmentDueDay}
                  onChange={(e) =>
                    setNewCommitmentDueDay(e.target.value)
                  }
                  className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Due day (1-31)"
                />

              </div>

            </div>


            <label
              htmlFor="comm-account"
              className="sr-only"
            >
              Deduction Account
            </label>

            <select
              id="comm-account"
              name="comm-account"
              required
              value={newCommitmentAccount}
              onChange={(e) =>
                setNewCommitmentAccount(e.target.value)
              }
              className="w-full bg-white/60 border border-white/40 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >

              <option value="">
                Select deduct account...
              </option>

              {accounts.map(a => (
                <option
                  key={a.id}
                  value={a.id}
                >
                  {a.account_name}
                </option>
              ))}

            </select>


            <button
              type="submit"
              disabled={saving}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              Add Commitment
            </button>

          </form>

        </ModalWrapper>
      )}


      {/* ======================================================
          API / AUTOMATION MODAL
      ====================================================== */}

      {activeModal === 'api' && (
        <ModalWrapper title="Automation & Shortcuts" closeModal={closeModal}>
          <div className="space-y-5">
            <p className="text-sm text-slate-500 leading-relaxed">
              Use your FlowState User ID to authenticate your iOS Shortcuts. <strong className="text-slate-700">Keep this ID secure.</strong>
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your User ID</label>
              
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={user?.id || ''} 
                  aria-label="User ID"
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-700 outline-none"
                />
                <button 
                  onClick={copyToClipboard}
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2.5 rounded-lg transition-colors border border-blue-100"
                  title="Copy User ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 flex gap-2.5">
              <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Paste this ID into the Import Question when installing the Apple Shortcut. All OCR receipts will automatically route to your personal vault.
              </p>
            </div>
          </div>
        </ModalWrapper>
      )}

    </div>
  )
}