// src/components/modals/BankAccountsModal.jsx
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  Plus, Trash2, Edit2, Archive, ArchiveRestore,
  Wallet, ChevronDown, ChevronUp, ArrowRight
} from 'lucide-react'
import { ModalWrapper } from './ModalWrapper'
import { AccountCard } from '../shared/AccountCard'
import { AccountEditorModal } from './AccountEditorModal'
import { ConfirmSheet } from '../shared/ConfirmSheet'
import { Sheet } from '../shared/Sheet'
import { AccountDropdown } from '../shared/AccountDropdown'
import { formatMYR } from '../../utils/formatters'

export const BankAccountsModal = ({
  user,
  accounts,
  classifications,
  closeModal,
  fetchAllData,
  showToast
}) => {
  const [editorAccount, setEditorAccount] = useState(undefined)

  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingArchive, setPendingArchive] = useState(null)
  const [moveWarning, setMoveWarning] = useState(null)
  const [moveTargets, setMoveTargets] = useState({}) // commitmentId → accountId

  const [showArchived, setShowArchived] = useState(false)
  const [saving, setSaving] = useState(false)

  const isEditorOpen = editorAccount !== undefined

  const activeAccounts = accounts.filter((a) => !a.is_archived)
  const archivedAccounts = accounts.filter((a) => a.is_archived)

  const openNewEditor = () => setEditorAccount(null)
  const openEditEditor = (acc) => setEditorAccount(acc)
  const closeEditor = () => setEditorAccount(undefined)

  const handleEditorSaved = async () => {
    closeEditor()
    await fetchAllData()
  }

  // ----------------------------------------------------------
  // Remove flow
  // ----------------------------------------------------------
  const handleRemoveClick = async (acc) => {
    const [txRes, cmtRes, activeBillsRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .or(`source_account_id.eq.${acc.id},destination_account_id.eq.${acc.id}`),
      supabase
        .from('commitments')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', acc.id),
      // Fetch the full rows so we can show a Move sheet
      supabase
        .from('commitments')
        .select('id, name, amount, due_day_of_month, account_id')
        .eq('account_id', acc.id)
        .eq('is_active', true)
        .order('due_day_of_month', { ascending: true })
    ])

    const txCount = txRes.count || 0
    const cmtCount = cmtRes.count || 0
    const activeBills = activeBillsRes.data || []

    // No history → safe to delete
    if (txCount === 0 && cmtCount === 0) {
      setPendingDelete(acc)
      return
    }

    // Active bills → offer to move them
    if (activeBills.length > 0) {
      const defaultTarget =
        accounts.find((a) => a.id !== acc.id && !a.is_archived)?.id || ''
      const initialTargets = {}
      activeBills.forEach((b) => {
        initialTargets[b.id] = defaultTarget
      })
      setMoveTargets(initialTargets)
      setMoveWarning({ account: acc, bills: activeBills, txCount, cmtCount })
      return
    }

    // Has history but no active bills → just archive
    setPendingArchive({ ...acc, txCount, cmtCount })
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

  const archiveAccount = async (accId) => {
    const { data, error } = await supabase
      .from('accounts')
      .update({ is_archived: true, is_pinned: false })
      .eq('id', accId)
      .select()

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('Archive failed — no rows affected. Check RLS on accounts.')
    }
  }

  const confirmArchive = async () => {
    if (!pendingArchive) return
    setSaving(true)
    try {
      await archiveAccount(pendingArchive.id)
      showToast('Account archived', 'success')
      setPendingArchive(null)
      fetchAllData()
    } catch (error) {
      showToast('Error archiving account: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // ----------------------------------------------------------
  // Move bills + archive (3a)
  // ----------------------------------------------------------
  const handleMoveAndArchive = async () => {
    if (!moveWarning) return

    const { account, bills } = moveWarning

    // Every bill needs a target account
    const missing = bills.find((b) => !moveTargets[b.id])
    if (missing) {
      showToast(`Choose a destination for "${missing.name}"`, 'warning')
      return
    }

    // Guard: destination can't be the account being archived
    const toSelf = bills.find((b) => moveTargets[b.id] === account.id)
    if (toSelf) {
      showToast(`"${toSelf.name}" can't stay on the account being archived`, 'warning')
      return
    }

    setSaving(true)
    try {
      // Group bills by destination so we can batch updates
      const byTarget = new Map()
      for (const bill of bills) {
        const target = moveTargets[bill.id]
        if (!byTarget.has(target)) byTarget.set(target, [])
        byTarget.get(target).push(bill.id)
      }

      for (const [targetId, billIds] of byTarget.entries()) {
        const { error } = await supabase
          .from('commitments')
          .update({ account_id: targetId })
          .in('id', billIds)
        if (error) throw error
      }

      await archiveAccount(account.id)

      showToast(
        `Moved ${bills.length} bill${bills.length === 1 ? '' : 's'} and archived ${account.account_name}`,
        'success'
      )
      setMoveWarning(null)
      setMoveTargets({})
      fetchAllData()
    } catch (error) {
      showToast('Error moving bills: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleArchiveAnyway = async () => {
    if (!moveWarning) return
    setSaving(true)
    try {
      await archiveAccount(moveWarning.account.id)
      showToast(
        `Account archived. ${moveWarning.bills.length} bill${moveWarning.bills.length === 1 ? '' : 's'} now need a new account.`,
        'success'
      )
      setMoveWarning(null)
      setMoveTargets({})
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

  // Destination options for the Move sheet — never the account being archived
  const moveDestinations = moveWarning
    ? accounts.filter((a) => a.id !== moveWarning.account.id && !a.is_archived)
    : []

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
    return (
    <>
      <ModalWrapper title="Bank Accounts" closeModal={closeModal}>
        <div className="space-y-3">
          {activeAccounts.length === 0 && archivedAccounts.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="w-14 h-14 bg-surface-2 rounded-2xl flex items-center justify-center mx-auto mb-3 text-fg-subtle">
                <Wallet className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-fg">No accounts yet</p>
              <p className="text-xs text-fg-subtle mt-1 max-w-[220px] mx-auto leading-relaxed">
                Add your first bank or wallet account to start tracking.
              </p>
              <button
                onClick={openNewEditor}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-brand-solid hover:bg-brand-solid-hover text-white text-xs font-bold rounded-xl transition-colors"
                style={{ minHeight: 44 }}
              >
                <Plus className="w-4 h-4" /> Add Account
              </button>
            </div>
          )}

          {activeAccounts.length > 0 && (
            <div className="space-y-2">
              {activeAccounts.map((acc) => {
                const classLabel =
                  classifications.find((c) => c.key_name === acc.classification)?.label ||
                  acc.classification

                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between gap-2 p-2 bg-surface-2 border border-line rounded-xl"
                  >
                    <button
                      type="button"
                      onClick={() => openEditEditor(acc)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left rounded-lg px-1 py-1 hover:bg-surface transition-colors"
                      aria-label={`Edit ${acc.account_name}`}
                    >
                      <AccountCard account={acc} size="chip" />
                      <span className="text-xs text-fg-subtle truncate">{classLabel}</span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditEditor(acc)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-fg-subtle hover:bg-brand-soft hover:text-brand transition-colors"
                        aria-label={`Edit ${acc.account_name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveClick(acc)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-danger/70 hover:bg-danger-soft hover:text-danger transition-colors"
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

          {(activeAccounts.length > 0 || archivedAccounts.length > 0) && (
            <button
              onClick={openNewEditor}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-colors shadow-sm border bg-brand-solid text-white border-brand-solid hover:bg-brand-solid-hover"
              style={{ minHeight: 44 }}
            >
              <Plus className="w-4 h-4" /> Add Account
            </button>
          )}

          {archivedAccounts.length > 0 && (
            <div>
              <button
                onClick={() => setShowArchived((s) => !s)}
                className="w-full flex items-center justify-between p-3 bg-surface hover:bg-surface-2 border border-line rounded-xl transition-colors"
                style={{ minHeight: 44 }}
                aria-expanded={showArchived}
              >
                <span className="text-[10px] text-fg-muted uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-fg-subtle" />
                  Archived ({archivedAccounts.length})
                </span>
                {showArchived ? (
                  <ChevronUp className="w-4 h-4 text-fg-subtle" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-fg-subtle" />
                )}
              </button>

              {showArchived && (
                <div className="mt-2 space-y-1.5 animate-fadeIn">
                  {archivedAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between gap-2 p-2 bg-surface-2/50 border border-line/60 rounded-xl opacity-75"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <AccountCard account={acc} size="chip" />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleRestore(acc)}
                          disabled={saving}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-fg-subtle hover:bg-success-soft hover:text-success transition-colors disabled:opacity-50"
                          aria-label={`Restore ${acc.account_name}`}
                          title="Restore"
                        >
                          <ArchiveRestore className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveClick(acc)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-danger/70 hover:bg-danger-soft hover:text-danger transition-colors"
                          aria-label={`Remove ${acc.account_name}`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ModalWrapper>

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

      {pendingDelete && (
        <ConfirmSheet
          destructive
          saving={saving}
          title={`Delete "${pendingDelete.account_name}"?`}
          message="This can't be undone. The account has no transactions or bills, so it's safe to remove."
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {pendingArchive && (
        <ConfirmSheet
          destructive={false}
          saving={saving}
          title={`Archive "${pendingArchive.account_name}"?`}
          message={(() => {
            const parts = []
            if (pendingArchive.txCount > 0) {
              parts.push(
                `${pendingArchive.txCount} transaction${pendingArchive.txCount === 1 ? '' : 's'}`
              )
            }
            if (pendingArchive.cmtCount > 0) {
              parts.push(
                `${pendingArchive.cmtCount} bill${pendingArchive.cmtCount === 1 ? '' : 's'}`
              )
            }
            return `This account has ${parts.join(' and ')}. Archiving hides it from the dashboard and selectors, but keeps all its history and analytics intact.`
          })()}
          confirmLabel="Archive"
          onConfirm={confirmArchive}
          onCancel={() => setPendingArchive(null)}
        />
      )}

      {moveWarning && (
        <Sheet
          title={`Archive "${moveWarning.account.account_name}"?`}
          onClose={() => {
            if (!saving) {
              setMoveWarning(null)
              setMoveTargets({})
            }
          }}
          saving={saving}
          maxWidth="md:max-w-lg"
        >
          <p className="text-xs text-fg-muted leading-relaxed">
            This account has{' '}
            <strong className="text-fg">
              {moveWarning.bills.length} active bill
              {moveWarning.bills.length === 1 ? '' : 's'}
            </strong>
            . Choose where to move {moveWarning.bills.length === 1 ? 'it' : 'them'} before
            archiving, or archive anyway and fix them later.
          </p>

          <div className="space-y-2">
            {moveWarning.bills.map((bill) => (
              <div
                key={bill.id}
                className="bg-surface-2 border border-line rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-fg truncate">{bill.name}</p>
                    <p className="text-[11px] text-fg-subtle">
                      {formatMYR(bill.amount)} · due day {bill.due_day_of_month}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-fg-subtle shrink-0" />
                  <div className="flex-1 min-w-0">
                    <AccountDropdown
                      accounts={moveDestinations}
                      value={moveTargets[bill.id] || ''}
                      onChange={(v) =>
                        setMoveTargets((prev) => ({ ...prev, [bill.id]: v }))
                      }
                      includeAll={false}
                      label={`New account for ${bill.name}`}
                      placeholder="Select account…"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {moveDestinations.length === 0 && (
            <div className="bg-warning-soft border border-warning-border rounded-xl p-3">
              <p className="text-xs text-warning-text leading-relaxed">
                You have no other active accounts to move bills to. Add a new account first,
                or archive anyway and fix the bills from the radar.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={handleMoveAndArchive}
              disabled={saving || moveDestinations.length === 0}
              className="w-full py-3 rounded-xl text-sm font-bold bg-brand-solid hover:bg-brand-solid-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: 44 }}
            >
              {saving ? 'Moving…' : 'Move bills & archive'}
            </button>

            <button
              type="button"
              onClick={handleArchiveAnyway}
              disabled={saving}
              className="w-full py-3 rounded-xl text-xs font-semibold text-warning-text bg-warning-soft hover:bg-warning/20 border border-warning-border transition-colors disabled:opacity-50"
              style={{ minHeight: 44 }}
            >
              Archive anyway, fix bills later
            </button>

            <button
              type="button"
              onClick={() => {
                setMoveWarning(null)
                setMoveTargets({})
              }}
              disabled={saving}
              className="w-full py-3 rounded-xl text-xs font-semibold text-fg-muted hover:bg-surface-2 transition-colors disabled:opacity-50"
              style={{ minHeight: 44 }}
            >
              Cancel
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}