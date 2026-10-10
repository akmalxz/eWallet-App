// src/components/split/DebtHub.jsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  CheckCircle2, Clock, User, Users, Loader2,
  ChevronDown, ChevronUp, HandCoins, Wallet, Trash2, Check, X, ChevronRight,
  RefreshCw, AlertTriangle
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatMYR } from '../../utils/formatters'
import { ConfirmSheet } from '../shared/ConfirmSheet'
import { DebtDetailSheet } from './DebtDetailSheet'
import { SessionHistory } from './SessionHistory'

export function DebtHub({ user, showToast, onDebtsChanged }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [debts, setDebts] = useState([])
  const [profileMap, setProfileMap] = useState({})
  const [contactMap, setContactMap] = useState({})
  const [sessionMap, setSessionMap] = useState({})
  const [activeSide, setActiveSide] = useState('owed_to_you')
  const [expandedPerson, setExpandedPerson] = useState(null)
  const [confirmDebt, setConfirmDebt] = useState(null)
  const [settling, setSettling] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [rejectingId, setRejectingId] = useState(null)
  const [markingPaidId, setMarkingPaidId] = useState(null)
  const [detailDebt, setDetailDebt] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const notifyChanged = useCallback(() => {
    window.dispatchEvent(new CustomEvent('debts-changed'))
    onDebtsChanged?.()
  }, [onDebtsChanged])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await fetchDebts({ silent: true })
      notifyChanged()
    } finally {
      setRefreshing(false)
    }
  }

  const fetchDebts = useCallback(async (opts = {}) => {
    const { silent = false } = opts
    if (!silent) setLoading(true)
    setError(null)
    try {
      const { data: debtRows, error: debtErr } = await supabase
        .from('split_debts')
        .select('id, amount, status, created_at, creditor_id, debtor_user_id, debtor_contact_id, session_id, debtor_marked_paid_at, dispute_status, dispute_reason')
        .or(`creditor_id.eq.${user.id},debtor_user_id.eq.${user.id}`)
        .in('status', ['pending', 'pending_confirmation'])
        .order('created_at', { ascending: false })

      if (debtErr) throw debtErr
      const rows = debtRows || []
      setDebts(rows)

      const userIds = new Set()
      const contactIds = new Set()
      const sessionIds = new Set()
      rows.forEach(r => {
        if (r.debtor_user_id) userIds.add(r.debtor_user_id)
        if (r.creditor_id) userIds.add(r.creditor_id)
        if (r.debtor_contact_id) contactIds.add(r.debtor_contact_id)
        if (r.session_id) sessionIds.add(r.session_id)
      })
      userIds.delete(user.id)

      const [profilesRes, contactsRes, sessionsRes] = await Promise.all([
        userIds.size
          ? supabase.from('profiles').select('id, first_name, username').in('id', [...userIds])
          : Promise.resolve({ data: [] }),
        contactIds.size
          ? supabase.from('contacts').select('id, name').in('id', [...contactIds])
          : Promise.resolve({ data: [] }),
        sessionIds.size
          ? supabase.from('split_sessions').select('id, merchant, subtotal, tax, service_charge, total, created_at').in('id', [...sessionIds])
          : Promise.resolve({ data: [] })
      ])

      const pMap = {}
      ;(profilesRes.data || []).forEach(p => { pMap[p.id] = p })
      setProfileMap(pMap)

      const cMap = {}
      ;(contactsRes.data || []).forEach(c => { cMap[c.id] = c })
      setContactMap(cMap)

      const sMap = {}
      ;(sessionsRes.data || []).forEach(s => { sMap[s.id] = s })
      setSessionMap(sMap)
    } catch (err) {
      setError(err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    if (user?.id) fetchDebts()
  }, [user?.id, fetchDebts])

  useEffect(() => {
    const handler = () => fetchDebts({ silent: true })
    window.addEventListener('debts-changed', handler)
    return () => window.removeEventListener('debts-changed', handler)
  }, [fetchDebts])

  const { owedToYouDebts, youOweDebts } = useMemo(() => {
    const owed = []
    const owe = []
    for (const d of debts) {
      if (d.creditor_id === user.id) owed.push(d)
      else if (d.debtor_user_id === user.id) owe.push(d)
    }
    return { owedToYouDebts: owed, youOweDebts: owe }
  }, [debts, user.id])

  const owedToYouTotal = owedToYouDebts.reduce((s, d) => s + (Number(d.amount) || 0), 0)
  const youOweTotal = youOweDebts.reduce((s, d) => s + (Number(d.amount) || 0), 0)

  const owedToYouCount = useMemo(() => {
    const keys = new Set()
    owedToYouDebts.forEach(d => keys.add(d.debtor_user_id || d.debtor_contact_id))
    return keys.size
  }, [owedToYouDebts])

  const youOweCount = useMemo(() => {
    const keys = new Set()
    youOweDebts.forEach(d => keys.add(d.creditor_id))
    return keys.size
  }, [youOweDebts])

  const groupedOwedToYou = useMemo(() => {
    const groups = {}
    for (const debt of owedToYouDebts) {
      const key = debt.debtor_user_id || debt.debtor_contact_id
      if (!key) continue
      if (!groups[key]) {
        const profile = debt.debtor_user_id ? profileMap[debt.debtor_user_id] : null
        const contact = debt.debtor_contact_id ? contactMap[debt.debtor_contact_id] : null
        groups[key] = {
          id: key,
          type: debt.debtor_user_id ? 'user' : 'ghost',
          name: profile
            ? (profile.first_name || profile.username || 'Unknown')
            : (contact?.name || 'Unknown'),
          total: 0,
          awaitingCount: 0,
          debts: []
        }
      }
      groups[key].total += Number(debt.amount) || 0
      if (debt.status === 'pending_confirmation') groups[key].awaitingCount++
      groups[key].debts.push(debt)
    }
    return Object.values(groups).sort((a, b) => b.total - a.total)
  }, [owedToYouDebts, profileMap, contactMap])

  const groupedYouOwe = useMemo(() => {
    const groups = {}
    for (const debt of youOweDebts) {
      const key = debt.creditor_id
      if (!key) continue
      if (!groups[key]) {
        const profile = profileMap[key]
        groups[key] = {
          id: key,
          type: 'user',
          name: profile
            ? (profile.first_name || profile.username || 'Unknown')
            : 'Someone',
          total: 0,
          awaitingCount: 0,
          debts: []
        }
      }
      groups[key].total += Number(debt.amount) || 0
      if (debt.status === 'pending_confirmation') groups[key].awaitingCount++
      groups[key].debts.push(debt)
    }
    return Object.values(groups).sort((a, b) => b.total - a.total)
  }, [youOweDebts, profileMap])

  const totalAwaitingConfirm = owedToYouDebts.filter(d => d.status === 'pending_confirmation').length

  const handleSettle = async () => {
    if (!confirmDebt) return
    setSettling(true)
    try {
      const { data, error: rpcErr } = await supabase.rpc('settle_split_debt', {
        p_debt_id: confirmDebt.id
      })
      if (rpcErr) throw rpcErr
      if (!data?.success) throw new Error('Settlement failed')

      showToast(`Settled ${formatMYR(confirmDebt.amount)}`, 'success')
      setConfirmDebt(null)
      await fetchDebts()
      notifyChanged()
    } catch (err) {
      showToast('Failed to settle: ' + err.message, 'error')
    } finally {
      setSettling(false)
    }
  }

  const handleReject = async (debt) => {
    setRejectingId(debt.id)
    try {
      const { data, error: rpcErr } = await supabase.rpc('reject_split_debt_confirmation', {
        p_debt_id: debt.id
      })
      if (rpcErr) throw rpcErr
      if (!data?.success) throw new Error('Reject failed')
      showToast('Moved back to pending', 'info')
      await fetchDebts()
      notifyChanged()
    } catch (err) {
      showToast('Failed to reject: ' + err.message, 'error')
    } finally {
      setRejectingId(null)
    }
  }

  const handleMarkPaid = async (debt) => {
    setMarkingPaidId(debt.id)
    try {
      const { data, error: rpcErr } = await supabase.rpc('mark_split_debt_paid', {
        p_debt_id: debt.id
      })
      if (rpcErr) throw rpcErr
      if (!data?.success) throw new Error('Mark failed')
      showToast('Marked paid — waiting for confirmation', 'success')
      await fetchDebts()
      notifyChanged()
    } catch (err) {
      showToast('Failed: ' + err.message, 'error')
    } finally {
      setMarkingPaidId(null)
    }
  }

  const handleDeleteSession = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    const sessionId = confirmDelete.sessionId
    try {
      const { error: claimsErr } = await supabase
        .from('split_claims').delete().eq('session_id', sessionId)
      if (claimsErr) throw claimsErr

      const { error: debtsErr } = await supabase
        .from('split_debts').delete().eq('session_id', sessionId)
      if (debtsErr) throw debtsErr

      const { error: sessionErr } = await supabase
        .from('split_sessions').delete().eq('id', sessionId)
      if (sessionErr) throw sessionErr

      showToast('Session deleted', 'success')
      setConfirmDelete(null)
      await fetchDebts()
      notifyChanged()
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-fg-muted">
        <Loader2 className="w-6 h-6 animate-spin mb-3" />
        <p className="text-sm">Loading your debts…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-danger-soft border border-danger-border rounded-2xl p-4 text-sm text-danger-text">
        Could not load debts: {error}
      </div>
    )
  }

  const allClear = groupedOwedToYou.length === 0 && groupedYouOwe.length === 0

  return (
    <>
      {/* Small refresh bar */}
      <div className="flex justify-end mb-2 -mt-1">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors disabled:opacity-50"
          style={{ minHeight: 32 }}
          aria-label="Refresh debts"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      {/* Two toggle cards — tap to switch which list is shown */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => setActiveSide('you_owe')}
          className={`rounded-2xl p-3.5 border shadow-sm text-left transition-all ${
            activeSide === 'you_owe' ? 'ring-2 ring-warning' : ''
          } ${
            youOweTotal > 0
              ? 'bg-warning-soft border-warning-border'
              : 'bg-surface border-line'
          }`}
          aria-pressed={activeSide === 'you_owe'}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <HandCoins className={`w-3.5 h-3.5 ${youOweTotal > 0 ? 'text-warning' : 'text-fg-subtle'}`} />
            <p className={`text-[10px] font-bold uppercase tracking-wider ${
              youOweTotal > 0 ? 'text-warning' : 'text-fg-subtle'
            }`}>
              You owe
            </p>
          </div>
          <p className="text-lg font-black text-fg leading-tight">
            {formatMYR(youOweTotal)}
          </p>
          <p className="text-[11px] text-fg-muted mt-0.5">
            {youOweCount === 0 ? 'All clear' : `${youOweCount} ${youOweCount === 1 ? 'person' : 'people'}`}
          </p>
        </button>

        <button
          onClick={() => setActiveSide('owed_to_you')}
          className={`rounded-2xl p-3.5 border shadow-sm text-left transition-all ${
            activeSide === 'owed_to_you' ? 'ring-2 ring-brand' : ''
          } ${
            owedToYouTotal > 0
              ? 'bg-brand-soft border-brand'
              : 'bg-surface border-line'
          }`}
          aria-pressed={activeSide === 'owed_to_you'}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className={`w-3.5 h-3.5 ${owedToYouTotal > 0 ? 'text-brand' : 'text-fg-subtle'}`} />
            <p className={`text-[10px] font-bold uppercase tracking-wider ${
              owedToYouTotal > 0 ? 'text-brand' : 'text-fg-subtle'
            }`}>
              Owed to you
            </p>
          </div>
          <p className="text-lg font-black text-fg leading-tight">
            {formatMYR(owedToYouTotal)}
          </p>
          <p className="text-[11px] text-fg-muted mt-0.5">
            {owedToYouCount === 0 ? 'All clear' : `${owedToYouCount} ${owedToYouCount === 1 ? 'person' : 'people'}`}
          </p>
        </button>
      </div>

      {totalAwaitingConfirm > 0 && activeSide === 'owed_to_you' && (
        <div className="bg-warning-soft border border-warning-border rounded-xl p-3 mb-4 flex items-start gap-2">
          <Clock className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-fg leading-relaxed">
            <strong>{totalAwaitingConfirm}</strong> debt{totalAwaitingConfirm === 1 ? '' : 's'} awaiting your confirmation.
          </p>
        </div>
      )}

      {allClear && (
        <div className="flex flex-col items-center justify-center py-12 text-center px-6 bg-surface border border-line rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-success-soft flex items-center justify-center text-success mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-fg">All settled up</p>
          <p className="text-xs text-fg-muted mt-1 max-w-xs leading-relaxed">
            No pending splits in either direction.
          </p>
        </div>
      )}

      {/* ---- OWED TO YOU ---- */}
      {!allClear && activeSide === 'owed_to_you' && (
        groupedOwedToYou.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6 bg-surface border border-line rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center text-fg-subtle mb-4">
              <Wallet className="w-7 h-7" />
            </div>
            <p className="text-base font-bold text-fg">No one owes you</p>
            <p className="text-xs text-fg-muted mt-1 max-w-xs leading-relaxed">
              Start a new split from the tab above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {groupedOwedToYou.map(person => {
              const isExpanded = expandedPerson === person.id
              const isUser = person.type === 'user'
              return (
                <div key={person.id} className="bg-surface border border-line rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedPerson(isExpanded ? null : person.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-2/50 transition-colors"
                    aria-expanded={isExpanded}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isUser ? 'bg-brand-soft text-brand' : 'bg-purple-soft text-purple'
                    }`}>
                      {isUser ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-fg truncate">{person.name}</p>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {person.debts.length} {person.debts.length === 1 ? 'session' : 'sessions'}
                        {person.awaitingCount > 0 && (
                          <span className="ml-1.5 text-warning font-bold">
                            · {person.awaitingCount} awaiting
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="text-base font-black text-fg shrink-0">
                      {formatMYR(person.total)}
                    </p>
                    <div className="text-fg-muted shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-line bg-surface-2/30">
                      {person.debts.map(debt => {
                        const session = sessionMap[debt.session_id]
                        const merchant = session?.merchant || 'Split bill'
                        const isAwaiting = debt.status === 'pending_confirmation'
                        const isRejecting = rejectingId === debt.id
                        return (
                          <div
                            key={debt.id}
                            className={`p-3 border-b border-line last:border-b-0 ${isAwaiting ? 'bg-warning-soft/40' : ''}`}
                          >
                            <button
                              type="button"
                              onClick={() => setDetailDebt({ debt, mode: 'creditor', counterpartyName: person.name })}
                              className="w-full flex items-center gap-2 mb-2 text-left rounded-lg -mx-1 px-1 py-1 hover:bg-surface-2/60 transition-colors"
                              style={{ minHeight: 44 }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-fg truncate">{merchant}</p>
                                <p className="text-[11px] mt-0.5 flex items-center gap-1 flex-wrap">
                                  {debt.dispute_status === 'open' ? (
                                    <span className="inline-flex items-center gap-1 text-warning font-bold">
                                      <AlertTriangle className="w-3 h-3" />
                                      Disputed
                                    </span>
                                  ) : isAwaiting ? (
                                    <span className="text-fg-subtle flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> Marked paid by them
                                    </span>
                                  ) : (
                                    <span className="text-fg-subtle">Tap for breakdown</span>
                                  )}
                                  <ChevronRight className="w-3 h-3 text-fg-subtle" />
                                </p>
                              </div>
                              <p className="text-sm font-bold text-fg shrink-0">
                                {formatMYR(debt.amount)}
                              </p>
                            </button>

                            <div className="flex items-center gap-2">
                              {isAwaiting ? (
                                <>
                                  <button
                                    onClick={() => setConfirmDebt(debt)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-success bg-success-soft hover:bg-success hover:text-white border border-success-border transition-colors"
                                    style={{ minHeight: 44 }}
                                    aria-label={`Confirm ${formatMYR(debt.amount)} from ${merchant}`}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Confirm received
                                  </button>
                                  <button
                                    onClick={() => handleReject(debt)}
                                    disabled={isRejecting}
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-fg-muted bg-surface border border-line hover:bg-surface-2 transition-colors disabled:opacity-50"
                                    style={{ minHeight: 44 }}
                                    aria-label={`Reject confirmation for ${merchant}`}
                                  >
                                    {isRejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                    Not received
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setConfirmDebt(debt)}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-success bg-success-soft hover:bg-success hover:text-white border border-success-border transition-colors"
                                  style={{ minHeight: 44 }}
                                  aria-label={`Settle ${formatMYR(debt.amount)} from ${merchant}`}
                                >
                                  <HandCoins className="w-3.5 h-3.5" />
                                  Settle
                                </button>
                              )}
                              <button
                                onClick={() => setConfirmDelete({ sessionId: debt.session_id, merchant })}
                                className="shrink-0 flex items-center justify-center w-11 h-11 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                                aria-label={`Delete session ${merchant}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ---- YOU OWE ---- */}
      {!allClear && activeSide === 'you_owe' && (
        groupedYouOwe.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6 bg-surface border border-line rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-success-soft flex items-center justify-center text-success mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-base font-bold text-fg">You don't owe anyone</p>
            <p className="text-xs text-fg-muted mt-1 max-w-xs leading-relaxed">
              Nothing pending in your direction.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {groupedYouOwe.map(person => {
              const isExpanded = expandedPerson === person.id
              return (
                <div key={person.id} className="bg-surface border border-line rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedPerson(isExpanded ? null : person.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-2/50 transition-colors"
                    aria-expanded={isExpanded}
                  >
                    <div className="w-10 h-10 rounded-xl bg-warning-soft text-warning flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-fg truncate">{person.name}</p>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {person.debts.length} {person.debts.length === 1 ? 'session' : 'sessions'}
                        {person.awaitingCount > 0 && (
                          <span className="ml-1.5 text-warning font-bold">· awaiting</span>
                        )}
                      </p>
                    </div>
                    <p className="text-base font-black text-fg shrink-0">
                      {formatMYR(person.total)}
                    </p>
                    <div className="text-fg-muted shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-line bg-surface-2/30">
                      {person.debts.map(debt => {
                        const session = sessionMap[debt.session_id]
                        const merchant = session?.merchant || 'Split bill'
                        const isAwaiting = debt.status === 'pending_confirmation'
                        const isMarking = markingPaidId === debt.id
                        return (
                          <div
                            key={debt.id}
                            className={`p-3 border-b border-line last:border-b-0 ${isAwaiting ? 'bg-warning-soft/40' : ''}`}
                          >
                            <button
                              type="button"
                              onClick={() => setDetailDebt({ debt, mode: 'debtor', counterpartyName: person.name })}
                              className="w-full flex items-center gap-2 mb-2 text-left rounded-lg -mx-1 px-1 py-1 hover:bg-surface-2/60 transition-colors"
                              style={{ minHeight: 44 }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-fg truncate">{merchant}</p>
                                <p className="text-[11px] mt-0.5 flex items-center gap-1 flex-wrap">
                                  {debt.dispute_status === 'open' ? (
                                    <span className="inline-flex items-center gap-1 text-warning font-bold">
                                      <AlertTriangle className="w-3 h-3" />
                                      Your dispute is open
                                    </span>
                                  ) : isAwaiting ? (
                                    <span className="text-fg-subtle flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> Awaiting confirmation
                                    </span>
                                  ) : (
                                    <span className="text-fg-subtle">Tap for breakdown</span>
                                  )}
                                  <ChevronRight className="w-3 h-3 text-fg-subtle" />
                                </p>
                              </div>
                              <p className="text-sm font-bold text-fg shrink-0">
                                {formatMYR(debt.amount)}
                              </p>
                            </button>

                            {isAwaiting ? (
                              <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-fg-subtle bg-surface-2 border border-line">
                                <Clock className="w-3.5 h-3.5" />
                                Awaiting their confirmation
                              </div>
                            ) : (
                              <button
                                onClick={() => handleMarkPaid(debt)}
                                disabled={isMarking}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-success bg-success-soft hover:bg-success hover:text-white border border-success-border transition-colors disabled:opacity-50"
                                style={{ minHeight: 44 }}
                              >
                                {isMarking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                I've paid
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ---- SESSION HISTORY ---- */}
      <SessionHistory user={user} />


      {/* Detail sheet */}
      {detailDebt && (() => {
        const freshDebt =
          debts.find(d => d.id === detailDebt.debt.id) || detailDebt.debt
        return (
          <DebtDetailSheet
            debt={freshDebt}
            session={sessionMap[freshDebt.session_id]}
            mode={detailDebt.mode}
            counterpartyName={detailDebt.counterpartyName}
            onClose={() => setDetailDebt(null)}
            onChanged={() => fetchDebts({ silent: true })}
          />
        )
      })()}

      {confirmDebt && (
        <ConfirmSheet
          destructive={false}
          saving={settling}
          title="Mark as settled?"
          message={(() => {
            const session = sessionMap[confirmDebt.session_id]
            const merchant = session?.merchant || 'this split'
            const debtorName = confirmDebt.debtor_user_id
              ? (profileMap[confirmDebt.debtor_user_id]?.first_name || profileMap[confirmDebt.debtor_user_id]?.username || 'the debtor')
              : (contactMap[confirmDebt.debtor_contact_id]?.name || 'the debtor')
            const isRegistered = !!confirmDebt.debtor_user_id
            return isRegistered
              ? `Records ${formatMYR(confirmDebt.amount)} from ${merchant} as paid by ${debtorName}, and adds it to their ledger.`
              : `Records ${formatMYR(confirmDebt.amount)} from ${merchant} as paid by ${debtorName}.`
          })()}
          confirmLabel="Mark settled"
          onConfirm={handleSettle}
          onCancel={() => setConfirmDebt(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmSheet
          destructive
          saving={deleting}
          title={`Delete "${confirmDelete.merchant}"?`}
          message="This removes the entire session, every claim on it, and every debt tied to it — for you and everyone who owed you. This can't be undone."
          confirmLabel="Delete session"
          onConfirm={handleDeleteSession}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  )
}