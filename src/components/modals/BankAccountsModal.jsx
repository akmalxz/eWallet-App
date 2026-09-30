// src/components/modals/BankAccountsModal.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  Plus, Trash2, Edit2, Archive, ArchiveRestore, AlertTriangle,
  Wallet, ChevronDown, ChevronUp, Pause
} from 'lucide-react'
import { ModalWrapper } from './ModalWrapper'
import { AccountCard } from '../shared/AccountCard'
import { AccountEditorModal } from './AccountEditorModal'

export const BankAccountsModal = ({
  user,
  accounts,
  classifications,
  closeModal,
  fetchAllData,
  showToast
}) => {
  // Editor state — undefined (closed) | null (new) | object (edit)
  const [editorAccount, setEditorAccount] = useState(undefined)

  // Delete / archive flows
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingArchive, setPendingArchive] = useState(null)
  const [commitmentWarning, setCommitmentWarning] = useState(null)

  const [showArchived, setShowArchived] = useState(false)
  const [saving, setSaving] = useState(false)

  const isEditorOpen = editorAccount !== undefined

  // Split the list
  const activeAccounts = accounts.filter(a => !a.is_archived)
  const archivedAccounts = accounts.filter(a => a.is_archived)

  const openNewEditor = () => setEditorAccount(null)
  const openEditEditor = (acc) => setEditorAccount(acc)
  const closeEditor = () => setEditorAccount(undefined)

  const handleEditorSaved = async () => {
    closeEditor()
    await fetchAllData()
  }

  // ----------------------------------------------------------
  // Remove flow — decides between Delete and Archive
  // ----------------------------------------------------------
  const handleRemoveClick = async (acc) => {
    const [txRes, cmtRes, activeCmtRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .or(`source_account_id.eq.${acc.id},destination_account_id.eq.${acc.id}`),
      supabase
        .from('commitments')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', acc.id),
      supabase
        .from('commitments')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', acc.id)
        .eq('is_active', true)
    ])

    const txCount = txRes.count || 0
    const cmtCount = cmtRes.count || 0
    const activeCmtCount = activeCmtRes.count || 0

    const counts = { txCount, cmtCount, activeCmtCount }

    // No history at all → safe to delete
    if (txCount === 0 && cmtCount === 0) {
      setPendingDelete({ ...acc, ...counts })
      return
    }

    // Has history → archive, but first check for ACTIVE commitments
    if (activeCmtCount > 0) {
      setCommitmentWarning({ ...acc, ...counts })
      return
    }

    setPendingArchive({ ...acc, ...counts })
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', pendingDelete.id)
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Delete failed — no rows affected. Check RLS on accounts.')
      }

      showToast('Account deleted', 'success')
      setPendingDelete(null)
      fetchAllData()
    } catch (error) {
      showToast('Error deleting account: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmArchive = async () => {
    if (!pendingArchive) return
    setSaving(true)
    try {
      // Clear pin so a hidden pin doesn't conflict with the single-pin rule
      const { data, error } = await supabase
        .from('accounts')
        .update({ is_archived: true, is_pinned: false })
        .eq('id', pendingArchive.id)
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Archive failed — no rows affected. Check RLS on accounts.')
      }

      showToast('Account archived', 'success')
      setPendingArchive(null)
      fetchAllData()
    } catch (error) {
      showToast('Error archiving account: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (acc) => {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('accounts')
        .update({ is_archived: false })
        .eq('id', acc.id)
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Restore failed — no rows affected. Check RLS on accounts.')
      }

      showToast('Account restored', 'success')
      fetchAllData()
    } catch (error) {
      showToast('Error restoring account: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  return (
    <>
      <ModalWrapper title="Bank Accounts" closeModal={closeModal}>

        <div className="space-y-3">

          {/* ================ EMPTY STATE ================ */}
          {activeAccounts.length === 0 && archivedAccounts.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Wallet className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No accounts yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                Add your first bank or wallet account to start tracking.
              </p>
              <button
                onClick={openNewEditor}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
                style={{ minHeight: 44 }}
              >
                <Plus className="w-4 h-4" /> Add Account
              </button>
            </div>
          )}

          {/* ================ ACTIVE LIST ================ */}
          {activeAccounts.length > 0 && (
            <div className="space-y-2">
              {activeAccounts.map(acc => {
                const classLabel =
                  classifications.find(c => c.key_name === acc.classification)?.label
                  || acc.classification

                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between gap-2 p-2 bg-white/60 border border-white/60 rounded-xl"
                  >
                    <button
                      type="button"
                      onClick={() => openEditEditor(acc)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left rounded-lg px-1 py-1 hover:bg-white transition-colors"
                      aria-label={`Edit ${acc.account_name}`}
                    >
                      <AccountCard account={acc} size="chip" />
                      <span className="text-xs text-slate-400 truncate">
                        {classLabel}
                      </span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditEditor(acc)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        aria-label={`Edit ${acc.account_name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveClick(acc)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        aria-label={`Remove ${acc.account_name}`}
                        title="Delete or archive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ================ ADD BUTTON ================ */}
          {(activeAccounts.length > 0 || archivedAccounts.length > 0) && (
            <button
              onClick={openNewEditor}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-colors shadow-sm border bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
              style={{ minHeight: 44 }}
            >
              <Plus className="w-4 h-4" /> Add Account
            </button>
          )}

          {/* ================ ARCHIVED SECTION ================ */}
          {archivedAccounts.length > 0 && (
            <div>
              <button
                onClick={() => setShowArchived(s => !s)}
                className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors"
                style={{ minHeight: 44 }}
                aria-expanded={showArchived}
              >
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-slate-400" />
                  Archived ({archivedAccounts.length})
                </span>
                {showArchived
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              <div className={`grid transition-all duration-300 ease-in-out ${
                showArchived ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'
              }`}>
                <div className="overflow-hidden space-y-1.5">
                  {archivedAccounts.map(acc => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between gap-2 p-2 bg-slate-50/50 border border-slate-100 rounded-xl opacity-75"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <AccountCard account={acc} size="chip" />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleRestore(acc)}
                          disabled={saving}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-50"
                          aria-label={`Restore ${acc.account_name}`}
                          title="Restore"
                        >
                          <ArchiveRestore className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveClick(acc)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          aria-label={`Remove ${acc.account_name}`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </ModalWrapper>

      {/* ================ EDITOR ================ */}
      {isEditorOpen && (
        <AccountEditorModal
          user={user}
          account={editorAccount}
          accounts={accounts}
          classifications={classifications}
          onClose={closeEditor}
          onSaved={handleEditorSaved}
          showToast={showToast}
        />
      )}

      {/* ================ DELETE CONFIRMATION ================ */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[130] flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => !saving && setPendingDelete(null)}
        >
          <div
            className="w-full md:max-w-sm bg-white rounded-3xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Delete "{pendingDelete.account_name}"?
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  This can't be undone. The account has no transactions or
                  commitments, so it's safe to remove.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                style={{ minHeight: 44 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                style={{ minHeight: 44 }}
              >
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================ ARCHIVE CONFIRMATION ================ */}
      {pendingArchive && (
        <div
          className="fixed inset-0 z-[130] flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => !saving && setPendingArchive(null)}
        >
          <div
            className="w-full md:max-w-sm bg-white rounded-3xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Archive "{pendingArchive.account_name}"?
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  This account has{' '}
                  {pendingArchive.txCount > 0 && (
                    <strong>
                      {pendingArchive.txCount} transaction{pendingArchive.txCount === 1 ? '' : 's'}
                    </strong>
                  )}
                  {pendingArchive.txCount > 0 && pendingArchive.cmtCount > 0 && ' and '}
                  {pendingArchive.cmtCount > 0 && (
                    <strong>
                      {pendingArchive.cmtCount} commitment{pendingArchive.cmtCount === 1 ? '' : 's'}
                    </strong>
                  )}
                  . Archiving hides it from the dashboard and selectors, but
                  keeps all its history and analytics intact.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingArchive(null)}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                style={{ minHeight: 44 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmArchive}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50"
                style={{ minHeight: 44 }}
              >
                {saving ? 'Archiving…' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================ COMMITMENT WARNING ================ */}
      {commitmentWarning && (
        <div
          className="fixed inset-0 z-[130] flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setCommitmentWarning(null)}
        >
          <div
            className="w-full md:max-w-sm bg-white rounded-3xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <Pause className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Pause commitments first
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  "{commitmentWarning.account_name}" has{' '}
                  <strong>
                    {commitmentWarning.activeCmtCount} active commitment
                    {commitmentWarning.activeCmtCount === 1 ? '' : 's'}
                  </strong>
                  . Pause or move those commitments before archiving, so they
                  don't quietly disappear from your radar.
                </p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  You can pause them in Profile → Monthly Commitments.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCommitmentWarning(null)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
              style={{ minHeight: 44 }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}