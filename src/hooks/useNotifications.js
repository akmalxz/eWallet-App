// src/hooks/useNotifications.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const RESOLVED_DISPUTE_WINDOW_DAYS = 7

/**
 * Owns the notification state for the header bell and header pill.
 *
 * Actionable items (drive the bell badge):
 *   - youOwe           → debts where I'm the DEBTOR and status = 'pending'
 *                        (excluding debts with a recently resolved dispute)
 *   - awaitingConfirm  → debts where I'm the CREDITOR and status = 'pending_confirmation'
 *   - openDisputes     → debts where I'm the CREDITOR and dispute_status = 'open'
 *   - resolvedDisputes → debts where I'm the DEBTOR and dispute_status IN ('accepted','rejected')
 *                        with a resolution within the last 7 days
 *
 * Totals (drive the header pill):
 *   - You owe:  all debts where debtor_user_id = me, status IN (pending, pending_confirmation)
 *   - Owed:     all debts where creditor_id = me, status IN (pending, pending_confirmation)
 *               (receivables aren't affected by dispute resolution)
 */
export function useNotifications(user) {
  const [loading, setLoading] = useState(true)
  const [youOwe, setYouOwe] = useState([])
  const [awaitingConfirm, setAwaitingConfirm] = useState([])
  const [openDisputes, setOpenDisputes] = useState([])
  const [resolvedDisputes, setResolvedDisputes] = useState([])
  const [youOweTotal, setYouOweTotal] = useState(0)
  const [owedToYouTotal, setOwedToYouTotal] = useState(0)

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      const { data: debts, error } = await supabase
        .from('split_debts')
        .select('id, amount, status, session_id, creditor_id, debtor_user_id, debtor_contact_id, created_at, dispute_status, dispute_reason, dispute_resolved_at, dispute_resolution_note')
        .or(`creditor_id.eq.${user.id},debtor_user_id.eq.${user.id}`)
        .in('status', ['pending', 'pending_confirmation'])

      if (error || !debts) {
        setYouOwe([])
        setAwaitingConfirm([])
        setOpenDisputes([])
        setResolvedDisputes([])
        setYouOweTotal(0)
        setOwedToYouTotal(0)
        return
      }

      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - RESOLVED_DISPUTE_WINDOW_DAYS)

      const oweAsDebtor = []
      const confirmAsCreditor = []
      const disputesForMe = []
      const disputeUpdatesForMe = []
      let oweSum = 0
      let owedSum = 0

      debts.forEach(d => {
        if (d.creditor_id === user.id) {
          owedSum += Number(d.amount) || 0
          if (d.status === 'pending_confirmation') confirmAsCreditor.push(d)
          if (d.dispute_status === 'open') disputesForMe.push(d)
        } else if (d.debtor_user_id === user.id) {
          oweSum += Number(d.amount) || 0

          if (d.status === 'pending') {
            const hasRecentResolution =
              (d.dispute_status === 'accepted' || d.dispute_status === 'rejected') &&
              d.dispute_resolved_at &&
              new Date(d.dispute_resolved_at) > cutoff

            if (hasRecentResolution) {
              disputeUpdatesForMe.push(d)
            } else {
              oweAsDebtor.push(d)
            }
          }
          // status = 'pending_confirmation': debtor already acted; no notification needed
        }
      })

      const sessionIds = [...new Set([
        ...oweAsDebtor.map(d => d.session_id),
        ...confirmAsCreditor.map(d => d.session_id),
        ...disputesForMe.map(d => d.session_id),
        ...disputeUpdatesForMe.map(d => d.session_id)
      ].filter(Boolean))]

      const counterpartyIds = new Set()
      oweAsDebtor.forEach(d => { if (d.creditor_id) counterpartyIds.add(d.creditor_id) })
      confirmAsCreditor.forEach(d => { if (d.debtor_user_id) counterpartyIds.add(d.debtor_user_id) })
      disputesForMe.forEach(d => { if (d.debtor_user_id) counterpartyIds.add(d.debtor_user_id) })
      disputeUpdatesForMe.forEach(d => { if (d.creditor_id) counterpartyIds.add(d.creditor_id) })

      const [sessionsRes, profilesRes] = await Promise.all([
        sessionIds.length
          ? supabase.from('split_sessions').select('id, merchant').in('id', sessionIds)
          : Promise.resolve({ data: [] }),
        counterpartyIds.size
          ? supabase.from('profiles').select('id, first_name, username').in('id', [...counterpartyIds])
          : Promise.resolve({ data: [] })
      ])

      const sessionMap = {}
      ;(sessionsRes.data || []).forEach(s => { sessionMap[s.id] = s })
      const profileMap = {}
      ;(profilesRes.data || []).forEach(p => { profileMap[p.id] = p })

      const enrich = (debt, counterpartyId) => {
        const p = profileMap[counterpartyId]
        return {
          id: debt.id,
          amount: Number(debt.amount) || 0,
          status: debt.status,
          sessionId: debt.session_id,
          creditorId: debt.creditor_id,
          debtorUserId: debt.debtor_user_id,
          merchant: sessionMap[debt.session_id]?.merchant || 'Split bill',
          counterpartyName: p?.first_name || p?.username || 'Someone',
          disputeReason: debt.dispute_reason || null,
          disputeStatus: debt.dispute_status || null,
          disputeResolutionNote: debt.dispute_resolution_note || null,
          disputeResolvedAt: debt.dispute_resolved_at || null
        }
      }

      setYouOwe(oweAsDebtor.map(d => enrich(d, d.creditor_id)))
      setAwaitingConfirm(confirmAsCreditor.map(d => enrich(d, d.debtor_user_id)))
      setOpenDisputes(disputesForMe.map(d => enrich(d, d.debtor_user_id)))
      setResolvedDisputes(disputeUpdatesForMe.map(d => enrich(d, d.creditor_id)))
      setYouOweTotal(oweSum)
      setOwedToYouTotal(owedSum)
    } catch {
      // Best-effort
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  useEffect(() => {
    const handler = () => fetchNotifications()
    window.addEventListener('debts-changed', handler)
    return () => window.removeEventListener('debts-changed', handler)
  }, [fetchNotifications])

  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`split_debts_notifications_${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'split_debts', filter: `creditor_id=eq.${user.id}` },
        () => window.dispatchEvent(new CustomEvent('debts-changed')))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'split_debts', filter: `debtor_user_id=eq.${user.id}` },
        () => window.dispatchEvent(new CustomEvent('debts-changed')))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  // Badge count = unique debt IDs across all buckets (defensive dedupe)
  const actionableCount = new Set([
    ...youOwe.map(d => d.id),
    ...awaitingConfirm.map(d => d.id),
    ...openDisputes.map(d => d.id),
    ...resolvedDisputes.map(d => d.id)
  ]).size

  return {
    loading,
    youOwe,
    awaitingConfirm,
    openDisputes,
    resolvedDisputes,
    youOweTotal,
    owedToYouTotal,
    actionableCount,
    refetch: fetchNotifications
  }
}