// src/hooks/useTransactions.js
import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { monthKey } from '../utils/dateHelpers'

export const useTransactions = (user, showToast) => {
  const [accounts, setAccounts] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [commitments, setCommitments] = useState([])
  const [commitmentPayments, setCommitmentPayments] = useState([])
  const [monthlyExpenses, setMonthlyExpenses] = useState([])
  const [monthlyInflows, setMonthlyInflows] = useState([])
  const [pendingReceivables, setPendingReceivables] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAccounts = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('v_account_balances')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true })
      
    if (!error && data) {
      setAccounts(data.map(acc => {
        const { account_id, ...rest } = acc
        return { id: account_id, ...rest }
      }))
    }
  }, [user])

  const fetchCategories = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
    if (!error && data) setCategories(data)
  }, [user])

  const fetchRecentTransactions = useCallback(async (options = {}) => {
    const { limit = 50, offset = 0, search = '', append = false } = options
    if (!user) return { hasMore: false }

    let query = supabase
      .from('transactions')
      .select('id, amount, source_account_id, destination_account_id, category, transaction_date, description, needs_review, created_at, metadata')
      .eq('user_id', user.id)

    if (search) {
      // Escape single quotes for Postgres ilike
      const safeSearch = search.replace(/'/g, "''")
      query = query.or(`description.ilike.%${safeSearch}%,category.ilike.%${safeSearch}%`)
    }

    const { data, error } = await query
      .order('needs_review', { ascending: false })
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!error && data) {
      setRecentTransactions(prev => append ? [...prev, ...data] : data)
      return { hasMore: data.length === limit, data }
    }
    return { hasMore: false, data: [] }
  }, [user])

  const fetchCommitments = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('commitments')
      .select('*')
      .eq('user_id', user.id)
    if (!error && data) setCommitments(data)
  }, [user])

  const fetchMonthlyData = useCallback(async () => {
    if (!user) return
    const startOfLastMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() - 1,
      1
    ).toISOString()

    const minPaymentYear = new Date().getFullYear() - 1

    const [monthResult, paymentResult, inflowResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, amount, source_account_id, destination_account_id, category, transaction_date, description, needs_review, metadata')
        .eq('user_id', user.id)
        .is('destination_account_id', null)
        .gte('transaction_date', startOfLastMonth),
      supabase
        .from('commitments_payments')
        .select('id, commitment_id, period_year, period_month, status, transaction_id, created_at')
        .eq('user_id', user.id)
        .gte('period_year', minPaymentYear),
      supabase
        .from('transactions')
        .select('id, amount, source_account_id, destination_account_id, category, transaction_date, description, needs_review, metadata')
        .eq('user_id', user.id)
        .not('destination_account_id', 'is', null)
        .gte('transaction_date', startOfLastMonth)
    ])

    if (!monthResult.error) setMonthlyExpenses(monthResult.data || [])
    if (!paymentResult.error) setCommitmentPayments(paymentResult.data || [])
    if (!inflowResult.error) setMonthlyInflows(inflowResult.data || [])
  }, [user])

  const fetchReceivables = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data: debts, error: debtsErr } = await supabase
        .from('split_debts')
        .select('id, amount, session_id')
        .eq('creditor_id', user.id)
        .in('status', ['pending', 'pending_confirmation'])

      if (!debtsErr && debts && debts.length > 0) {
        const sessionIds = [...new Set(debts.map(d => d.session_id).filter(Boolean))]

        const { data: sessions } = sessionIds.length
          ? await supabase
              .from('split_sessions')
              .select('id, created_at')
              .in('id', sessionIds)
          : { data: [] }

        const sessionMonth = new Map(
          (sessions || []).map(s => [s.id, monthKey(s.created_at)])
        )
        const thisMonthK = monthKey(new Date())

        setPendingReceivables(debts.map(d => ({
          id: d.id,
          amount: Number(d.amount) || 0,
          sessionId: d.session_id,
          sessionMonth: sessionMonth.get(d.session_id) || null,
          isThisMonth: sessionMonth.get(d.session_id) === thisMonthK
        })))
      } else {
        setPendingReceivables([])
      }
    } catch {
      setPendingReceivables([])
    }
  }, [user?.id])

  const fetchInitialData = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await Promise.all([
        fetchAccounts(),
        fetchCategories(),
        fetchRecentTransactions({ limit: 50, offset: 0 }),
        fetchCommitments(),
        fetchMonthlyData(),
        fetchReceivables()
      ])
    } catch (err) {
      setError(err.message)
      showToast(`Failed to load data: ${err.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [user, showToast, fetchAccounts, fetchCategories, fetchRecentTransactions, fetchCommitments, fetchMonthlyData, fetchReceivables])

  useEffect(() => {
    if (!user?.id) return
    const handler = () => fetchReceivables()
    window.addEventListener('debts-changed', handler)
    return () => window.removeEventListener('debts-changed', handler)
  }, [fetchReceivables, user?.id])

  return {
    accounts,
    recentTransactions,
    commitments,
    commitmentPayments,
    monthlyExpenses,
    monthlyInflows,
    pendingReceivables,
    categories,
    isLoading,
    error,
    setAccounts,
    setRecentTransactions,
    setCommitments,
    setCommitmentPayments,
    setMonthlyExpenses,
    setMonthlyInflows,
    setPendingReceivables,
    setCategories,
    setIsLoading,
    setError,
    fetchInitialData,
    fetchAccounts,
    fetchCategories,
    fetchRecentTransactions,
    fetchCommitments,
    fetchMonthlyData,
    fetchReceivables
  }
}