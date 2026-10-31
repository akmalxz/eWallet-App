// src/hooks/useWealthHistory.js
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/**
 * Computes a monthly-resampled net worth history for the Wealth page.
 *
 * For each month boundary, net worth = sum of (starting_balance + net
 * transactions) for every account that existed at that boundary.
 * Excludes archived accounts (their history vanishes rather than
 * creating a phantom "drop" when archived — an accepted Phase 1 limit).
 */
export function useWealthHistory(user, accounts, { monthsBack = 6 } = {}) {
  const [rawTransactions, setRawTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const activeAccounts = useMemo(
    () => accounts.filter(a => !a.is_archived),
    [accounts]
  )

  useEffect(() => {
    if (!user?.id || activeAccounts.length === 0) {
      setLoading(false)
      setRawTransactions([])
      return
    }

    let cancelled = false

    const monthsAgoCutoff = new Date()
    monthsAgoCutoff.setMonth(monthsAgoCutoff.getMonth() - monthsBack)

    // Find the earliest account creation date. Guards against missing
    // or invalid `created_at` — the view might not return it for older
    // deployments, and even when present it's nullable.
    const earliestCreated = activeAccounts.reduce((min, a) => {
      if (!a.created_at) return min
      const c = new Date(a.created_at)
      if (Number.isNaN(c.getTime())) return min
      return !min || c < min ? c : min
    }, null)

    // Use the earlier of (earliest account creation, months-ago cutoff).
    // If earliestCreated is null, fall back to the months-ago cutoff so
    // the query is still valid.
    const cutoff = earliestCreated && earliestCreated < monthsAgoCutoff
      ? earliestCreated
      : monthsAgoCutoff

    const fetchHistory = async () => {
      setLoading(true)
      setError(null)
      const { data, error: fetchErr } = await supabase
        .from('transactions')
        .select('amount, source_account_id, destination_account_id, transaction_date')
        .eq('user_id', user.id)
        .gte('transaction_date', cutoff.toISOString())
        .order('transaction_date', { ascending: true })
        .limit(1000)

      if (cancelled) return
      if (fetchErr) {
        setError(fetchErr.message)
        setLoading(false)
        return
      }
      setRawTransactions(data || [])
      setLoading(false)
    }

    fetchHistory()
    return () => { cancelled = true }
  }, [user?.id, monthsBack, activeAccounts.length])

  const { history, currentNetWorth, monthDelta } = useMemo(() => {
    if (activeAccounts.length === 0) {
      return { history: [], currentNetWorth: 0, monthDelta: null }
    }

    const now = new Date()
    const boundaries = []
    for (let i = monthsBack; i >= 1; i--) {
      boundaries.push(new Date(now.getFullYear(), now.getMonth() - i, 1))
    }
    boundaries.push(new Date(now.getFullYear(), now.getMonth(), 1))
    boundaries.push(now)

    const sortedTxns = [...rawTransactions].sort(
      (a, b) => new Date(a.transaction_date) - new Date(b.transaction_date)
    )

    const running = new Map()
    for (const acc of activeAccounts) {
      running.set(acc.id, Number(acc.starting_balance) || 0)
    }

    const result = []
    let txnIdx = 0

    for (const boundary of boundaries) {
      while (
        txnIdx < sortedTxns.length &&
        new Date(sortedTxns[txnIdx].transaction_date) <= boundary
      ) {
        const tx = sortedTxns[txnIdx]
        const amt = Number(tx.amount) || 0
        if (tx.source_account_id && running.has(tx.source_account_id)) {
          running.set(tx.source_account_id, running.get(tx.source_account_id) - amt)
        }
        if (tx.destination_account_id && running.has(tx.destination_account_id)) {
          running.set(tx.destination_account_id, running.get(tx.destination_account_id) + amt)
        }
        txnIdx++
      }

      let total = 0
      for (const acc of activeAccounts) {
        // Skip accounts created after this boundary. Defensive: if
        // `created_at` is missing, assume the account existed (include it).
        if (acc.created_at) {
          const created = new Date(acc.created_at)
          if (!Number.isNaN(created.getTime()) && created > boundary) continue
        }
        total += running.get(acc.id) || 0
      }

      const isNow = boundary.getTime() === now.getTime()
      const label = isNow ? 'Now' : MONTH_LABELS[boundary.getMonth()]
      result.push({ date: boundary, label, netWorth: total })
    }

    const currentNetWorth = result[result.length - 1]?.netWorth || 0

    // Previous month's boundary is result[result.length - 2] (the
    // first-of-current-month point). Delta = current − that.
    const previousPoint = result[result.length - 2]
    let monthDelta = null
    if (previousPoint && previousPoint.netWorth !== undefined) {
      const change = currentNetWorth - previousPoint.netWorth
      monthDelta = {
        value: change,
        pct: previousPoint.netWorth !== 0
          ? (change / Math.abs(previousPoint.netWorth)) * 100
          : null
      }
    }

    return { history: result, currentNetWorth, monthDelta }
  }, [activeAccounts, rawTransactions, monthsBack])

  return { history, currentNetWorth, monthDelta, loading, error }
}