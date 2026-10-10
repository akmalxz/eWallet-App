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
  const [pendingReceivables, setPendingReceivables] = useState([])
  const [categories, setCategories] = useState([])
  const [classifications, setClassifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // ---------------------------------------------------------------------
  // Receivables — extracted so it can be refetched independently of the
  // full data load. Fired by `debts-changed` after any settle / dispute
  // action, so the banner and burn rate stay current without a reload.
  // ---------------------------------------------------------------------
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

  // Listener: any debts-changed event triggers a lightweight receivables
  // refetch. This is what makes the dashboard banner clear when a debt
  // is settled on another device, or from within the app.
  useEffect(() => {
    if (!user?.id) return
    const handler = () => fetchReceivables()
    window.addEventListener('debts-changed', handler)
    return () => window.removeEventListener('debts-changed', handler)
  }, [fetchReceivables, user?.id])

  const fetchAllData = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const startOfLastMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() - 1,
        1
      ).toISOString()

      const minPaymentYear = new Date().getFullYear() - 1

      const [
        accResult,
        catResult,
        classResult,
        txResult,
        commResult,
        monthResult,
        paymentResult
      ] = await Promise.all([
        supabase
          .from('v_account_balances')
          .select('*')
          .eq('user_id', user.id)
          .order('display_order', { ascending: true }),

        supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id)
          .order('name'),

        supabase
          .from('classifications')
          .select('*')
          .eq('user_id', user.id),

        supabase
          .from('transactions')
          .select('id, amount, source_account_id, destination_account_id, category, transaction_date, description, needs_review, created_at, metadata')
          .eq('user_id', user.id)
          .order('needs_review', { ascending: false })
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(30),

        supabase
          .from('commitments')
          .select('*')
          .eq('user_id', user.id),

        supabase
          .from('transactions')
          .select('id, amount, source_account_id, destination_account_id, category, transaction_date, needs_review, metadata')
          .eq('user_id', user.id)
          .is('destination_account_id', null)
          .gte('transaction_date', startOfLastMonth),

        supabase
          .from('commitments_payments')
          .select('id, commitment_id, period_year, period_month, status, transaction_id, created_at')
          .eq('user_id', user.id)
          .gte('period_year', minPaymentYear)
      ])

      if (accResult.error) throw accResult.error
      if (catResult.error) throw catResult.error
      if (txResult.error) throw txResult.error
      if (commResult.error) throw commResult.error

      // ------------------------------------------------------------
      // NORMALIZE ACCOUNTS
      // ------------------------------------------------------------
      let normalizedAccounts = (accResult.data || []).map(acc => {
        const { account_id, ...rest } = acc
        return { id: account_id, ...rest }
      })

      // ------------------------------------------------------------
      // SEEDING — ACCOUNTS
      // ------------------------------------------------------------
      if (normalizedAccounts.length === 0) {
        const defaultAccounts = [
          { user_id: user.id, account_name: 'Maybank', classification: 'hub' },
          { user_id: user.id, account_name: 'TNG eWallet', classification: 'ewallet' },
          { user_id: user.id, account_name: 'GX Bank', classification: 'digital_bank' },
          { user_id: user.id, account_name: 'Bank Rakyat', classification: 'savings' }
        ]

        const { error: insertError } = await supabase.from('accounts').insert(defaultAccounts)

        if (!insertError) {
          const { data: newAccounts } = await supabase
            .from('v_account_balances')
            .select('*')
            .eq('user_id', user.id)
            .order('display_order', { ascending: true })

          normalizedAccounts = (newAccounts || []).map(acc => {
            const { account_id, ...rest } = acc
            return { id: account_id, ...rest }
          })
        }
      }

      setAccounts(normalizedAccounts)

      // ------------------------------------------------------------
      // SEEDING — CATEGORIES
      // ------------------------------------------------------------
      let finalCategories = catResult.data || []

      if (finalCategories.length === 0) {
        const { data: mainCats } = await supabase
          .from('categories')
          .insert([
            { user_id: user.id, name: 'Food & Beverages', keywords: ['food', 'lunch', 'dinner', 'breakfast', 'makan', 'eat', 'restaurant'] },
            { user_id: user.id, name: 'Transport', keywords: ['lrt', 'mrt', 'grab', 'taxi', 'bus', 'train', 'petrol', 'fuel', 'parking', 'toll'] },
            { user_id: user.id, name: 'Income', keywords: ['salary', 'bonus', 'pay', 'income', 'paycheck', 'received'] },
            { user_id: user.id, name: 'Utilities', keywords: ['electric', 'water', 'internet', 'wifi', 'phone', 'bill', 'utility', 'tnb', 'syabas'] },
            { user_id: user.id, name: 'Entertainment', keywords: ['netflix', 'spotify', 'movie', 'game', 'subscription', 'entertainment'] }
          ])
          .select()

        if (mainCats) {
          const foodId = mainCats.find(c => c.name === 'Food & Beverages')?.id
          if (foodId) {
            await supabase.from('categories').insert([
              { user_id: user.id, name: 'Breakfast', parent_id: foodId, keywords: ['breakfast', 'pancake', 'toast'] },
              { user_id: user.id, name: 'Lunch', parent_id: foodId, keywords: ['lunch', 'nasi', 'rice'] },
              { user_id: user.id, name: 'Dinner', parent_id: foodId, keywords: ['dinner', 'steak', 'pasta'] },
              { user_id: user.id, name: 'Groceries', parent_id: foodId, keywords: ['groceries', 'supermarket', 'shopping'] }
            ])
          }

          const { data: newCats } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id)
            .order('name')

          finalCategories = newCats || []
        }
      }

      setCategories(finalCategories)

      // ------------------------------------------------------------
      // SEEDING — CLASSIFICATIONS
      // ------------------------------------------------------------
      let finalClassifications = classResult.data || []

      if (!finalClassifications || finalClassifications.length === 0) {
        try {
          const defaultClass = [
            { user_id: user.id, key_name: 'hub', label: 'Main Hub', icon_name: 'Landmark', color_class: 'text-blue-500', bg_class: 'bg-blue-50' },
            { user_id: user.id, key_name: 'ewallet', label: 'Daily eWallet', icon_name: 'Wallet', color_class: 'text-purple-500', bg_class: 'bg-purple-50' },
            { user_id: user.id, key_name: 'digital_bank', label: 'Digital Bank', icon_name: 'Activity', color_class: 'text-emerald-500', bg_class: 'bg-emerald-50' },
            { user_id: user.id, key_name: 'savings', label: 'Savings', icon_name: 'PiggyBank', color_class: 'text-amber-500', bg_class: 'bg-amber-50' }
          ]
          const { error: insertError } = await supabase.from('classifications').insert(defaultClass)

          if (!insertError) {
            const { data: refreshedClass } = await supabase
              .from('classifications')
              .select('*')
              .eq('user_id', user.id)

            finalClassifications = refreshedClass || []
          } else {
            throw new Error('Fallback execution')
          }
        } catch {
          finalClassifications = [
            { id: 'temp-hub', key_name: 'hub', label: 'Main Hub', icon_name: 'Landmark', color_class: 'text-blue-500', bg_class: 'bg-blue-50' },
            { id: 'temp-ewallet', key_name: 'ewallet', label: 'Daily eWallet', icon_name: 'Wallet', color_class: 'text-purple-500', bg_class: 'bg-purple-50' },
            { id: 'temp-digital', key_name: 'digital_bank', label: 'Digital Bank', icon_name: 'Activity', color_class: 'text-emerald-500', bg_class: 'bg-emerald-50' },
            { id: 'temp-savings', key_name: 'savings', label: 'Savings', icon_name: 'PiggyBank', color_class: 'text-amber-500', bg_class: 'bg-amber-50' }
          ]
        }
      }

      setClassifications(finalClassifications)

      // ------------------------------------------------------------
      // CORE TRANSACTION DATA
      // ------------------------------------------------------------
      setRecentTransactions(txResult.data || [])
      setCommitments(commResult.data || [])

      if (!monthResult.error) {
        setMonthlyExpenses(monthResult.data || [])
      }

      if (!paymentResult.error) {
        setCommitmentPayments(paymentResult.data || [])
      }

      // ------------------------------------------------------------
      // RECEIVABLES
      // ------------------------------------------------------------
      await fetchReceivables()

    } catch (error) {
      setError(error.message)
      showToast(`Failed to load data: ${error.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [user, showToast, fetchReceivables])

  return {
    accounts,
    recentTransactions,
    commitments,
    commitmentPayments,
    monthlyExpenses,
    pendingReceivables,
    categories,
    classifications,
    isLoading,
    error,
    setAccounts,
    setRecentTransactions,
    setCommitments,
    setCommitmentPayments,
    setMonthlyExpenses,
    setPendingReceivables,
    setCategories,
    setClassifications,
    setIsLoading,
    setError,
    fetchAllData,
    fetchReceivables
  }
}