// src/components/split/DebtorBanner.jsx
import { useState, useEffect, useMemo } from 'react'
import {
  HandCoins, ChevronDown, ChevronUp, User, Loader2,
  CheckCircle2, Clock, ChevronRight
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatMYR } from '../../utils/formatters'
import { DebtDetailSheet } from './DebtDetailSheet'

export function DebtorBanner({ user }) {
  const [loading, setLoading] = useState(true)
  const [debts, setDebts] = useState([])
  const [creditorMap, setCreditorMap] = useState({})
  const [sessionMap, setSessionMap] = useState({})       // session id → { merchant, subtotal, tax, service_charge, total, ... }
  const [claimsBySession, setClaimsBySession] = useState({}) // session id → [ claims for user ]
  const [expanded, setExpanded] = useState(false)
  const [markingId, setMarkingId] = useState(null)
  const [detailDebt, setDetailDebt] = useState(null)
  const [toast, setToast] = useState(null)

  const fetchDebts = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      const { data: debtRows } = await supabase
        .from('split_debts')
        .select('id, amount, status, created_at, creditor_id, session_id, debtor_marked_paid_at')
        .eq('debtor_user_id', user.id)
        .in('status', ['pending', 'pending_confirmation'])
        .order('created_at', { ascending: false })

      const rows = debtRows || []
      setDebts(rows)

      if (rows.length === 0) {
        setSessionMap({})
        setClaimsBySession({})
        return
      }

      const creditorIds = [...new Set(rows.map(r => r.creditor_id).filter(Boolean))]
      const sessionIds = [...new Set(rows.map(r => r.session_id).filter(Boolean))]

      // Three parallel reads: creditors, full session rows, my claims
      const [profilesRes, sessionsRes, claimsRes] = await Promise.all([
        creditorIds.length
          ? supabase.from('profiles').select('id, first_name, username').in('id', creditorIds)
          : Promise.resolve({ data: [] }),
        sessionIds.length
          ? supabase
              .from('split_sessions')
              .select('id, merchant, subtotal, tax, service_charge, total, created_at, host_id')
              .in('id', sessionIds)
          : Promise.resolve({ data: [] }),
        sessionIds.length
          ? supabase
              .from('split_claims')
              .select('id, session_id, item_name, item_price, share_weight, user_id')
              .in('session_id', sessionIds)
              .eq('user_id', user.id)
          : Promise.resolve({ data: [] })
      ])

      const pMap = {}
      ;(profilesRes.data || []).forEach(p => { pMap[p.id] = p })
      setCreditorMap(pMap)

      const sMap = {}
      ;(sessionsRes.data || []).forEach(s => { sMap[s.id] = s })
      setSessionMap(sMap)

      const cMap = {}
      ;(claimsRes.data || []).forEach(c => {
        if (!cMap[c.session_id]) cMap[c.session_id] = []
        cMap[c.session_id].push(c)
      })
      setClaimsBySession(cMap)
    } catch {
      // Best-effort — banner is non-critical
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleMarkPaid = async (debtId) => {
    setMarkingId(debtId)
    try {
      const { data, error } = await supabase.rpc('mark_split_debt_paid', {
        p_debt_id: debtId
      })
      if (error) throw error
      if (!data?.success) throw new Error('Mark failed')

      setToast({ type: 'success', message: 'Marked as paid — waiting for confirmation' })
      setTimeout(() => setToast(null), 4000)
      await fetchDebts()
    } catch (err) {
      setToast({ type: 'error', message: 'Could not mark as paid: ' + err.message })
      setTimeout(() => setToast(null), 5000)
    } finally {
      setMarkingId(null)
    }
  }

  const grouped = useMemo(() => {
    const groups = {}
    for (const debt of debts) {
      const key = debt.creditor_id
      if (!key) continue
      if (!groups[key]) {
        const profile = creditorMap[key]
        groups[key] = {
          id: key,
          name: profile
            ? (profile.first_name || profile.username || 'Unknown')
            : 'A friend',
          total: 0,
          debts: []
        }
      }
      groups[key].total += Number(debt.amount) || 0
      groups[key].debts.push(debt)
    }
    return Object.values(groups).sort((a, b) => b.total - a.total)
  }, [debts, creditorMap])

  const grandTotal = grouped.reduce((s, g) => s + g.total, 0)
  const awaitingCount = debts.filter(d => d.status === 'pending_confirmation').length

  if (loading || grouped.length === 0) return null

  return (
    <>
      <div className="bg-warning-soft border border-warning-border rounded-2xl overflow-hidden mb-4">
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center gap-3 p-4 text-left"
          style={{ minHeight: 44 }}
          aria-expanded={expanded}
        >
          <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-warning shrink-0">
            <HandCoins className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warning">
              You owe
            </p>
            <p className="text-sm font-bold text-fg truncate mt-0.5">
              {formatMYR(grandTotal)} to {grouped.length} {grouped.length === 1 ? 'person' : 'people'}
            </p>
            {awaitingCount > 0 && (
              <p className="text-[11px] text-fg-muted mt-0.5">
                {awaitingCount} awaiting confirmation
              </p>
            )}
          </div>
          <div className="text-fg-muted shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-warning-border bg-surface/40">
            {grouped.map(person => (
              <div key={person.id} className="p-3 border-b border-warning-border last:border-b-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-fg-muted shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <p className="flex-1 text-sm font-bold text-fg truncate">{person.name}</p>
                  <p className="text-sm font-black text-fg shrink-0">
                    {formatMYR(person.total)}
                  </p>
                </div>

                <div className="pl-11 space-y-2">
                  {person.debts.map(debt => {
                    const session = sessionMap[debt.session_id]
                    const isAwaiting = debt.status === 'pending_confirmation'
                    const isMarking = markingId === debt.id

                    return (
                      <div key={debt.id} className="flex items-center gap-2 py-1">
                        {/* Tappable content — opens the itemized breakdown */}
                        <button
                          type="button"
                          onClick={() => setDetailDebt(debt)}
                          className="flex-1 min-w-0 text-left rounded-lg -ml-1 px-1 py-1 hover:bg-surface-2/60 transition-colors"
                          style={{ minHeight: 44 }}
                          aria-label={`View breakdown for ${session?.merchant || 'split'}`}
                        >
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-bold text-fg truncate">
                              {session?.merchant || 'Split bill'}
                            </p>
                            <ChevronRight className="w-3 h-3 text-fg-subtle shrink-0" />
                          </div>
                          {isAwaiting ? (
                            <p className="text-[10px] text-fg-subtle mt-0.5 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> Awaiting confirmation
                            </p>
                          ) : (
                            <p className="text-[10px] text-fg-subtle mt-0.5">
                              Tap for breakdown
                            </p>
                          )}
                        </button>

                        <p className="text-xs font-black text-fg shrink-0">
                          {formatMYR(debt.amount)}
                        </p>

                        {isAwaiting ? (
                          <span className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-fg-subtle bg-surface-2 border border-line">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkPaid(debt.id)}
                            disabled={isMarking}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-success bg-success-soft hover:bg-success hover:text-white border border-success-border transition-colors disabled:opacity-50"
                            style={{ minHeight: 36 }}
                            aria-label={`Mark ${session?.merchant || 'split'} as paid`}
                          >
                            {isMarking
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <CheckCircle2 className="w-3 h-3" />}
                            I've paid
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className="p-3 bg-surface-2/50 text-[11px] text-fg-muted leading-relaxed">
              Transfer your share directly. Once the host confirms, this disappears.
            </div>
          </div>
        )}
      </div>

      {/* Detail sheet */}
      {detailDebt && (
        <DebtDetailSheet
          debt={detailDebt}
          session={sessionMap[detailDebt.session_id]}
          claims={claimsBySession[detailDebt.session_id] || []}
          creditorName={
            creditorMap[detailDebt.creditor_id]?.first_name ||
            creditorMap[detailDebt.creditor_id]?.username ||
            'the host'
          }
          onClose={() => setDetailDebt(null)}
        />
      )}

      {/* Lightweight toast */}
      {toast && (
        <div className={`fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-md px-4 py-3 rounded-xl border shadow-lg text-sm font-medium ${
          toast.type === 'error'
            ? 'bg-danger-soft border-danger-border text-danger-text'
            : 'bg-success-soft border-success-border text-success-text'
        }`}>
          {toast.message}
        </div>
      )}
    </>
  )
}