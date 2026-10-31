// src/components/wealth/SavingsMigrationPrompt.jsx
import { useState, useMemo } from 'react'
import { ArrowRight, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatMYR } from '../../utils/formatters'
import { ConfirmSheet } from '../shared/ConfirmSheet'

// Subcategories that indicate a genuine savings contribution (not a gift,
// donation, or other expense disguised with a "Savings" parent). Matched
// case-insensitively against the subcategory after "Savings > ".
const SAVINGS_SUBCATEGORY_KEYWORDS = [
  'asb', 'asnb', 'asm', 'tabung haji', 'tabunghaji', 'epf', 'prs'
]

const isSavingsSubcategory = (category) => {
  const lower = (category || '').toLowerCase().trim()
  if (!lower.startsWith('savings > ')) return false
  const sub = lower.replace('savings > ', '').trim()
  return SAVINGS_SUBCATEGORY_KEYWORDS.some(kw => sub.includes(kw))
}

export const SavingsMigrationPrompt = ({
  user,
  transactions = [],
  accounts = [],
  showToast,
  fetchRecentTransactions,
  fetchAccounts,
  fetchMonthlyData
}) => {
  const [dismissed, setDismissed] = useState(() => {
    if (!user?.id) return false
    try {
      return localStorage.getItem(`savingsMigration.dismissed.${user.id}`) === 'true'
    } catch {
      return false
    }
  })
  const [converting, setConverting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const candidates = useMemo(() => {
    return (transactions || []).filter(tx =>
        tx.source_account_id &&
        !tx.destination_account_id &&
        !tx.needs_review &&
        isSavingsSubcategory(tx.category)
    )
    }, [transactions])

  // Pick a destination account for the conversion. Prefer ASB/ASM, fall back
  // to Tabung Haji. If neither exists, hide the prompt — the user needs to
  // create one first, and it will appear once they do.
  const destination = useMemo(() => {
    const eligible = accounts.filter(a =>
      !a.is_archived &&
      (a.classification === 'fixed_price_ut' || a.classification === 'pilgrimage')
    )
    if (eligible.length === 0) return null
    // Prefer fixed_price_ut over pilgrimage if both exist.
    return eligible.find(a => a.classification === 'fixed_price_ut') || eligible[0]
  }, [accounts])

  const total = candidates.reduce((s, tx) => s + (Number(tx.amount) || 0), 0)

  if (!user?.id || dismissed || candidates.length === 0 || !destination) {
    return null
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(`savingsMigration.dismissed.${user.id}`, 'true')
    } catch {}
    setDismissed(true)
  }

  const handleConvert = async () => {
    setConverting(true)
    try {
      const ids = candidates.map(tx => tx.id)
      const { error } = await supabase
        .from('transactions')
        .update({
          destination_account_id: destination.id,
          category: 'Transfer'
        })
        .in('id', ids)

      if (error) throw error

      showToast(
        `Converted ${ids.length} savings contribution${ids.length === 1 ? '' : 's'} to transfers`,
        'success'
      )
      setShowConfirm(false)
      await Promise.all([
        fetchRecentTransactions?.(),
        fetchAccounts?.(),
        fetchMonthlyData?.()
      ])
    } catch (err) {
      showToast('Conversion failed: ' + err.message, 'error')
    } finally {
      setConverting(false)
    }
  }

  return (
    <>
      <div className="bg-brand-soft border border-brand/30 rounded-xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-brand shrink-0">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-brand uppercase tracking-wider">
            Savings can be tracked better
          </p>
          <p className="text-sm font-bold text-fg mt-0.5 tabular-figures">
            {candidates.length}{' '}
            {candidates.length === 1 ? 'contribution' : 'contributions'} totalling{' '}
            {formatMYR(total)}
          </p>
          <p className="text-[11px] text-fg-muted mt-0.5 leading-relaxed">
            We noticed savings transfers logged as expenses. Converting them to transfers
            moves the money into <strong className="text-fg">{destination.account_name}</strong>{' '}
            and stops them from counting as spending.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-brand-solid hover:bg-brand-solid-hover transition-colors"
              style={{ minHeight: 36 }}
            >
              Review & convert <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-fg-muted hover:bg-surface-2 transition-colors"
              style={{ minHeight: 36 }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmSheet
          saving={converting}
          title={`Convert ${candidates.length} transaction${candidates.length === 1 ? '' : 's'}?`}
          message={`This will record ${formatMYR(total)} as a transfer to ${destination.account_name}. Your burn rate and spending totals will update immediately. Individual transactions can still be edited later from the ledger.`}
          confirmLabel="Convert"
          onConfirm={handleConvert}
          onCancel={() => !converting && setShowConfirm(false)}
        />
      )}
    </>
  )
}