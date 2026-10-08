// src/components/split/SessionHistory.jsx
import { useState, useEffect, useCallback } from 'react'
import {
  ChevronDown, ChevronUp, Loader2, CheckCircle2, Receipt, User, Users
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatMYR } from '../../utils/formatters'

const PAGE_SIZE = 20

export function SessionHistory({ user }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState([])
  const [debtsBySession, setDebtsBySession] = useState({})
  const [nameMap, setNameMap] = useState({})
  const [hasMore, setHasMore] = useState(false)
  const [limit, setLimit] = useState(PAGE_SIZE)

  const fetchHistory = useCallback(async (currentLimit) => {
    if (!user?.id) return
    setLoading(true)
    try {
      // No host_id filter — RLS returns only sessions the user can read.
      const { data: sessionRows, error: sessErr } = await supabase
        .from('split_sessions')
        .select('id, merchant, total, subtotal, tax, service_charge, created_at, settled_at, host_id')
        .eq('status', 'settled')
        .order('settled_at', { ascending: false, nullsFirst: false })
        .limit(currentLimit + 1)

      if (sessErr) throw sessErr

      const rows = sessionRows || []
      const hasMoreFlag = rows.length > currentLimit
      const visible = rows.slice(0, currentLimit)

      setHasMore(hasMoreFlag)
      setSessions(visible)

      if (visible.length === 0) {
        setDebtsBySession({})
        setNameMap({})
        return
      }

      const sessionIds = visible.map(s => s.id)

      const { data: debtRows } = await supabase
        .from('split_debts')
        .select('id, session_id, amount, status, debtor_user_id, debtor_contact_id')
        .in('session_id', sessionIds)

      const grouped = {}
      ;(debtRows || []).forEach(d => {
        if (!grouped[d.session_id]) grouped[d.session_id] = []
        grouped[d.session_id].push(d)
      })
      setDebtsBySession(grouped)

      const userIds = new Set()
      const contactIds = new Set()
      ;(debtRows || []).forEach(d => {
        if (d.debtor_user_id) userIds.add(d.debtor_user_id)
        if (d.debtor_contact_id) contactIds.add(d.debtor_contact_id)
      })
      visible.forEach(s => {
        if (s.host_id && s.host_id !== user.id) userIds.add(s.host_id)
      })

      const [profilesRes, contactsRes] = await Promise.all([
        userIds.size
          ? supabase.from('profiles').select('id, first_name, username').in('id', [...userIds])
          : Promise.resolve({ data: [] }),
        contactIds.size
          ? supabase.from('contacts').select('id, name').in('id', [...contactIds])
          : Promise.resolve({ data: [] })
      ])

      const nMap = {}
      ;(profilesRes.data || []).forEach(p => {
        nMap[p.id] = p.first_name || p.username || 'Unknown'
      })
      ;(contactsRes.data || []).forEach(c => {
        nMap[c.id] = c.name || 'Guest'
      })
      setNameMap(nMap)
    } catch {
      // Best-effort
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) fetchHistory(limit)
  }, [user?.id, limit, fetchHistory])

  useEffect(() => {
    const handler = () => fetchHistory(limit)
    window.addEventListener('debts-changed', handler)
    return () => window.removeEventListener('debts-changed', handler)
  }, [fetchHistory, limit])

  const handleLoadMore = () => setLimit(prev => prev + PAGE_SIZE)

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Always render the section — even with zero sessions. The header
  // is the persistent affordance; the body handles the three states
  // (loading, empty, populated).
  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-3.5 bg-surface border border-line rounded-2xl hover:bg-surface-2/50 transition-colors"
        style={{ minHeight: 52 }}
        aria-expanded={expanded}
      >
        <span className="text-sm font-bold text-fg flex items-center gap-2">
          <Receipt className="w-4 h-4 text-fg-muted" />
          Session history
          <span className="text-xs font-medium text-fg-subtle">
            ({sessions.length}{hasMore ? '+' : ''})
          </span>
        </span>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-fg-muted" />
          : <ChevronDown className="w-4 h-4 text-fg-muted" />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {loading && sessions.length === 0 ? (
            <div className="bg-surface border border-line rounded-2xl p-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-fg-subtle animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-surface border border-line rounded-2xl p-6 text-center">
              <Receipt className="w-8 h-8 text-fg-subtle mx-auto mb-2" />
              <p className="text-sm font-bold text-fg">No past sessions</p>
              <p className="text-xs text-fg-subtle mt-1 leading-relaxed max-w-[260px] mx-auto">
                Splits you complete will appear here once everyone has settled up.
              </p>
            </div>
          ) : (
            <>
              {sessions.map(session => {
                const debts = debtsBySession[session.id] || []
                const isHost = session.host_id === user.id
                const hostName = isHost
                  ? 'you'
                  : (nameMap[session.host_id] || 'someone')

                const ownDebt = !isHost
                  ? debts.find(d => d.debtor_user_id === user.id)
                  : null

                return (
                  <div
                    key={session.id}
                    className="bg-surface border border-line rounded-2xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-line">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <p className="text-sm font-bold text-fg truncate">
                          {session.merchant || 'Split bill'}
                        </p>
                        <p className="text-sm font-black text-fg shrink-0">
                          {formatMYR(session.total || 0)}
                        </p>
                      </div>
                      <p className="text-[11px] text-fg-subtle">
                        {formatDate(session.settled_at || session.created_at)}
                        {' · '}
                        {isHost
                          ? 'You paid'
                          : `Paid by ${hostName}`}
                      </p>
                      {!isHost && ownDebt && (
                        <p className="text-[11px] text-brand font-bold mt-1">
                          Your share: {formatMYR(ownDebt.amount)}
                        </p>
                      )}
                    </div>

                    {debts.length > 0 ? (
                      <div className="divide-y divide-line">
                        {debts.map(debt => {
                          const name = debt.debtor_user_id
                            ? nameMap[debt.debtor_user_id] || 'Unknown'
                            : debt.debtor_contact_id
                              ? nameMap[debt.debtor_contact_id] || 'Guest'
                              : 'Unknown'
                          const isGhost = !debt.debtor_user_id
                          const isMe = debt.debtor_user_id === user.id
                          const isSettled = debt.status === 'settled'
                          return (
                            <div
                              key={debt.id}
                              className={`flex items-center gap-3 px-4 py-2.5 ${
                                isMe ? 'bg-brand-soft/40' : ''
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isGhost
                                  ? 'bg-purple-soft text-purple'
                                  : isMe
                                    ? 'bg-brand text-white'
                                    : 'bg-brand-soft text-brand'
                              }`}>
                                {isGhost
                                  ? <Users className="w-3.5 h-3.5" />
                                  : <User className="w-3.5 h-3.5" />}
                              </div>
                              <p className={`flex-1 text-xs truncate ${
                                isMe ? 'font-bold text-fg' : 'font-medium text-fg'
                              }`}>
                                {isMe ? 'You' : name}
                              </p>
                              <p className="text-xs font-bold text-fg shrink-0">
                                {formatMYR(debt.amount)}
                              </p>
                              <CheckCircle2
                                className={`w-4 h-4 shrink-0 ${
                                  isSettled ? 'text-success' : 'text-fg-subtle'
                                }`}
                              />
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-[11px] text-fg-subtle italic">
                        No one else owed money on this session.
                      </div>
                    )}
                  </div>
                )
              })}

              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-fg-muted bg-surface-2 border border-line hover:bg-surface-3 transition-colors disabled:opacity-50"
                  style={{ minHeight: 44 }}
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    : 'Load more'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}