// src/components/split/DebtDetailSheet.jsx
import { useState, useEffect, useCallback } from 'react'
import {
  X, Clock, Utensils, CheckCircle2, Loader2, AlertTriangle, MessageSquare
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatMYR } from '../../utils/formatters'

const MISMATCH_TOLERANCE = 0.005

export function DebtDetailSheet({
  debt,
  session,
  mode = 'debtor',
  counterpartyName = '',
  onClose,
  onChanged
}) {
  const [loading, setLoading] = useState(true)
  const [claims, setClaims] = useState([])
  const [localDebt, setLocalDebt] = useState(debt)

  // Dispute UI state
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeSubmitting, setDisputeSubmitting] = useState(false)
  const [disputeError, setDisputeError] = useState(null)
  const [showAcceptForm, setShowAcceptForm] = useState(false)
  const [acceptAmount, setAcceptAmount] = useState('')
  const [acceptNote, setAcceptNote] = useState('')
  const [rejectNote, setRejectNote] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  useEffect(() => { setLocalDebt(debt) }, [debt])

  const fetchClaims = useCallback(async () => {
    if (!debt) return
    setLoading(true)
    try {
      const q = supabase
        .from('split_claims')
        .select('id, item_name, item_price, share_weight, user_id, contact_id')
        .eq('session_id', debt.session_id)

      if (debt.debtor_user_id) q.eq('user_id', debt.debtor_user_id)
      else if (debt.debtor_contact_id) q.eq('contact_id', debt.debtor_contact_id)

      const { data, error } = await q
      if (error) throw error
      setClaims(data || [])
    } catch {
      setClaims([])
    } finally {
      setLoading(false)
    }
  }, [debt])

  useEffect(() => { fetchClaims() }, [fetchClaims])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const notify = () => {
    window.dispatchEvent(new CustomEvent('debts-changed'))
    onChanged?.()
  }

  const handleRaiseDispute = async () => {
    setDisputeSubmitting(true)
    setDisputeError(null)
    try {
      const { data, error } = await supabase.rpc('raise_split_debt_dispute', {
        p_debt_id: localDebt.id,
        p_reason: disputeReason.trim() || null
      })
      if (error) throw error
      if (!data?.success) throw new Error('Could not raise dispute')

      // Update local state optimistically
      setLocalDebt(prev => ({
        ...prev,
        dispute_status: 'open',
        disputed_at: new Date().toISOString(),
        dispute_reason: disputeReason.trim() || null
      }))
      setShowDisputeForm(false)
      setDisputeReason('')
      notify()
    } catch (err) {
      setDisputeError(err.message)
    } finally {
      setDisputeSubmitting(false)
    }
  }

  const handleAcceptDispute = async () => {
    const amt = parseFloat(acceptAmount)
    if (isNaN(amt) || amt <= 0) {
      setDisputeError('Enter a valid amount greater than 0')
      return
    }
    setDisputeSubmitting(true)
    setDisputeError(null)
    try {
      const { data, error } = await supabase.rpc('accept_split_debt_dispute', {
        p_debt_id: localDebt.id,
        p_new_amount: amt,
        p_note: acceptNote.trim() || null
      })
      if (error) throw error
      if (!data?.success) throw new Error('Could not accept dispute')

      setLocalDebt(prev => ({
        ...prev,
        amount: data.new_amount,
        dispute_status: 'accepted',
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolution_note: acceptNote.trim() || null
      }))
      setShowAcceptForm(false)
      setAcceptAmount('')
      setAcceptNote('')
      notify()
    } catch (err) {
      setDisputeError(err.message)
    } finally {
      setDisputeSubmitting(false)
    }
  }

  const handleRejectDispute = async () => {
    setDisputeSubmitting(true)
    setDisputeError(null)
    try {
      const { data, error } = await supabase.rpc('reject_split_debt_dispute', {
        p_debt_id: localDebt.id,
        p_note: rejectNote.trim() || null
      })
      if (error) throw error
      if (!data?.success) throw new Error('Could not reject dispute')

      setLocalDebt(prev => ({
        ...prev,
        dispute_status: 'rejected',
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolution_note: rejectNote.trim() || null
      }))
      setShowRejectForm(false)
      setRejectNote('')
      notify()
    } catch (err) {
      setDisputeError(err.message)
    } finally {
      setDisputeSubmitting(false)
    }
  }

  if (!localDebt) return null

  const isDebtorMode = mode === 'debtor'
  const tax = Number(session?.tax) || 0
  const service = Number(session?.service_charge) || 0
  const subtotal = Number(session?.subtotal) || 0

  const myItemTotal = claims.reduce(
    (s, c) => s + (Number(c.item_price) || 0) * (Number(c.share_weight) || 0),
    0
  )
  const sharePct = subtotal > 0 ? myItemTotal / subtotal : 0
  const myTax = tax * sharePct
  const myService = service * sharePct
  const computedTotal = myItemTotal + myTax + myService
  const roundingDiff = Number(localDebt.amount) - computedTotal
  const hasRounding = Math.abs(roundingDiff) >= MISMATCH_TOLERANCE

  const isAwaiting = localDebt.status === 'pending_confirmation'
  const disputeStatus = localDebt.dispute_status
  const hasOpenDispute = disputeStatus === 'open'
  const hasRejected = disputeStatus === 'rejected'
  const hasAccepted = disputeStatus === 'accepted'

  // Can the debtor raise a new dispute?
  const canDispute =
    isDebtorMode &&
    localDebt.status === 'pending' &&
    !hasOpenDispute

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full md:max-w-lg bg-surface rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[85vh] animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-line-strong" />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
              {isDebtorMode ? 'Your share' : 'Their share'}
            </p>
            <h3 className="text-base font-bold text-fg mt-0.5 truncate">
              {session?.merchant || 'Split bill'}
            </h3>
            <p className="text-[11px] text-fg-muted mt-0.5 truncate">
              {isDebtorMode ? `Owed to ${counterpartyName}` : `Owed by ${counterpartyName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Status pill */}
          <div className="flex items-center gap-2 flex-wrap">
            {hasOpenDispute ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning-soft border border-warning-border">
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                <span className="text-[11px] font-bold text-warning-text">
                  {isDebtorMode ? 'Your dispute is open' : 'Disputed by them'}
                </span>
              </div>
            ) : isAwaiting ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning-soft border border-warning-border">
                <Clock className="w-3.5 h-3.5 text-warning" />
                <span className="text-[11px] font-bold text-warning-text">
                  {isDebtorMode
                    ? `Awaiting confirmation from ${counterpartyName}`
                    : `${counterpartyName} marked paid`}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-soft border border-danger-border">
                <Clock className="w-3.5 h-3.5 text-danger" />
                <span className="text-[11px] font-bold text-danger-text">
                  {isDebtorMode ? 'Payment pending' : 'Not yet settled'}
                </span>
              </div>
            )}
          </div>

          {/* Dispute section — creditor with open dispute: resolve UI */}
          {!isDebtorMode && hasOpenDispute && (
            <section className="bg-warning-soft border border-warning-border rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-warning-text">
                    {counterpartyName} disputed this charge
                  </p>
                  {localDebt.dispute_reason && (
                    <p className="text-xs text-fg-muted mt-1 leading-relaxed break-words">
                      "{localDebt.dispute_reason}"
                    </p>
                  )}
                </div>
              </div>

              {!showAcceptForm && !showRejectForm && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAcceptForm(true)
                      setAcceptAmount(String(localDebt.amount))
                      setDisputeError(null)
                    }}
                    className="flex-1 py-2.5 rounded-lg text-xs font-bold text-success bg-success-soft hover:bg-success hover:text-white border border-success-border transition-colors"
                    style={{ minHeight: 44 }}
                  >
                    Adjust & accept
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectForm(true)
                      setDisputeError(null)
                    }}
                    className="flex-1 py-2.5 rounded-lg text-xs font-bold text-fg-muted bg-surface border border-line-strong hover:bg-surface-2 transition-colors"
                    style={{ minHeight: 44 }}
                  >
                    Reject dispute
                  </button>
                </div>
              )}

              {showAcceptForm && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
                    New amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-fg-subtle font-medium">
                      RM
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      inputMode="decimal"
                      value={acceptAmount}
                      onChange={(e) => setAcceptAmount(e.target.value)}
                      className="w-full bg-surface border border-line rounded-lg py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-brand transition-colors"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Optional note (e.g. 'You're right, missed that')"
                    value={acceptNote}
                    onChange={(e) => setAcceptNote(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-brand transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowAcceptForm(false); setDisputeError(null) }}
                      disabled={disputeSubmitting}
                      className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-fg-muted bg-surface border border-line hover:bg-surface-2 disabled:opacity-50"
                      style={{ minHeight: 44 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAcceptDispute}
                      disabled={disputeSubmitting}
                      className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white bg-success hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      style={{ minHeight: 44 }}
                    >
                      {disputeSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Accept
                    </button>
                  </div>
                </div>
              )}

              {showRejectForm && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Optional note (e.g. 'The laksa was yours')"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-brand transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowRejectForm(false); setDisputeError(null) }}
                      disabled={disputeSubmitting}
                      className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-fg-muted bg-surface border border-line hover:bg-surface-2 disabled:opacity-50"
                      style={{ minHeight: 44 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRejectDispute}
                      disabled={disputeSubmitting}
                      className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white bg-danger hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      style={{ minHeight: 44 }}
                    >
                      {disputeSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {disputeError && (
                <p className="text-[11px] text-danger font-medium">{disputeError}</p>
              )}
            </section>
          )}

          {/* Dispute section — debtor view: show status of any dispute */}
          {isDebtorMode && (hasRejected || hasAccepted) && (
            <section className={`rounded-xl p-4 space-y-2 border ${
              hasAccepted
                ? 'bg-success-soft border-success-border'
                : 'bg-surface-2/60 border-line'
            }`}>
              <div className="flex items-start gap-2">
                <MessageSquare className={`w-4 h-4 shrink-0 mt-0.5 ${hasAccepted ? 'text-success' : 'text-fg-subtle'}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold ${hasAccepted ? 'text-success-text' : 'text-fg-muted'}`}>
                    {hasAccepted
                      ? `${counterpartyName} adjusted this charge`
                      : `${counterpartyName} rejected your dispute`}
                  </p>
                  {localDebt.dispute_resolution_note && (
                    <p className="text-xs text-fg-muted mt-1 leading-relaxed break-words">
                      "{localDebt.dispute_resolution_note}"
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Debtor: dispute form */}
          {isDebtorMode && canDispute && (
            <section>
              {!showDisputeForm ? (
                <button
                  onClick={() => {
                    setShowDisputeForm(true)
                    setDisputeError(null)
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold text-warning-text bg-warning-soft border border-warning-border hover:bg-warning hover:text-white transition-colors"
                  style={{ minHeight: 44 }}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Something wrong? Dispute this charge
                </button>
              ) : (
                <div className="bg-warning-soft border border-warning-border rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-warning-text">
                    Tell {counterpartyName} what's wrong
                  </p>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="e.g. I didn't order the laksa"
                    rows={3}
                    maxLength={400}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-brand transition-colors resize-none"
                  />
                  {disputeError && (
                    <p className="text-[11px] text-danger font-medium">{disputeError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowDisputeForm(false); setDisputeReason(''); setDisputeError(null) }}
                      disabled={disputeSubmitting}
                      className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-fg-muted bg-surface border border-line hover:bg-surface-2 disabled:opacity-50"
                      style={{ minHeight: 44 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRaiseDispute}
                      disabled={disputeSubmitting}
                      className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white bg-warning hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      style={{ minHeight: 44 }}
                    >
                      {disputeSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      Submit dispute
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Items */}
          <section>
            <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5" />
              {isDebtorMode ? 'Your items' : 'Their items'} ({claims.length})
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-fg-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : claims.length === 0 ? (
              <div className="bg-surface-2/60 border border-line rounded-xl p-4 text-center">
                <p className="text-xs text-fg-muted">No items on record.</p>
              </div>
            ) : (
              <div className="bg-surface-2/40 border border-line rounded-xl divide-y divide-line overflow-hidden">
                {claims.map((c) => {
                  const price = Number(c.item_price) || 0
                  const weight = Number(c.share_weight) || 0
                  const lineTotal = price * weight
                  const isShared = weight < 0.999
                  return (
                    <div key={c.id} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-fg truncate">{c.item_name}</p>
                        {isShared && (
                          <p className="text-[11px] text-fg-subtle mt-0.5">
                            {formatMYR(price)} · {Math.round(weight * 100)}% share
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-bold text-fg shrink-0">{formatMYR(lineTotal)}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Summary */}
          <section className="bg-surface-2/40 border border-line rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">Items subtotal</span>
              <span className="font-bold text-fg">{formatMYR(myItemTotal)}</span>
            </div>
            {tax > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-fg-muted">
                  Tax
                  <span className="text-[11px] text-fg-subtle ml-1.5">
                    ({Math.round(sharePct * 100)}% of total)
                  </span>
                </span>
                <span className="font-medium text-fg">{formatMYR(myTax)}</span>
              </div>
            )}
            {service > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-fg-muted">Service</span>
                <span className="font-medium text-fg">{formatMYR(myService)}</span>
              </div>
            )}
            {hasRounding && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-fg-subtle italic">Rounding</span>
                <span className="font-medium text-fg-subtle">
                  {roundingDiff >= 0 ? '+' : ''}{formatMYR(roundingDiff)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <span className="text-sm font-bold text-fg">
                {isDebtorMode ? 'You owe' : 'They owe'}
              </span>
              <span className="text-lg font-black text-fg">
                {formatMYR(localDebt.amount)}
              </span>
            </div>
          </section>

          <p className="text-[11px] text-fg-subtle text-center leading-relaxed">
            Tax and service are split proportionally to what {isDebtorMode ? 'you' : 'they'} ordered.
          </p>
        </div>

        <div
          className="px-5 py-4 border-t border-line bg-surface-2/30 shrink-0"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-bold text-fg bg-surface hover:bg-surface-2 border border-line-strong transition-colors"
            style={{ minHeight: 44 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}