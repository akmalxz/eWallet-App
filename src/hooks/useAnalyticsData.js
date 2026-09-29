// src/hooks/useAnalyticsData.js
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'

export const useAnalyticsData = (user, showToast) => {
  const [rawTransactions, setRawTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    try {
      // Fetch 13 months (12 + 1 extra so month-over-month works for the oldest month)
      const start = new Date()
      start.setMonth(start.getMonth() - 13)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)

      const { data, error: fetchErr } = await supabase
        .from('transactions')
        .select(
          'id, amount, source_account_id, destination_account_id, category, transaction_date, description, needs_review'
        )
        .eq('user_id', user.id)
        .gte('transaction_date', start.toISOString())
        .order('transaction_date', { ascending: true })

      if (fetchErr) throw fetchErr
      setRawTransactions(data || [])
    } catch (err) {
      setError(err.message)
      showToast?.('Failed to load analytics: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [user, showToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ----------------------------------------------------------
  // Expenses: source set + destination null
  // Income: destination set + source null, OR category starts with "Income"
  // Transfers (both set): excluded from both
  // ----------------------------------------------------------
  const { expenses, income } = useMemo(() => {
    const exp = []
    const inc = []
    for (const tx of rawTransactions) {
      const hasSource = !!tx.source_account_id
      const hasDest = !!tx.destination_account_id
      const isIncomeCat =
        (tx.category || '').toLowerCase().startsWith('income')

      if (hasSource && !hasDest) exp.push(tx)
      else if ((!hasSource && hasDest) || isIncomeCat) inc.push(tx)
      // transfers (both) fall through: excluded
    }
    return { expenses: exp, income: inc }
  }, [rawTransactions])

  return { rawTransactions, expenses, income, loading, error, refetch: fetchData }
}