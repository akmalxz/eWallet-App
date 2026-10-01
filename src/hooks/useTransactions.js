// src/hooks/useTransactions.js
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export const useTransactions = (user, showToast) => {
  const [accounts, setAccounts] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [commitments, setCommitments] = useState([])
  const [commitmentPayments, setCommitmentPayments] = useState([])
  const [monthlyExpenses, setMonthlyExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [classifications, setClassifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAllData = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // ============================================================
      // FIRE ALL INDEPENDENT FETCHES IN PARALLEL
      // ============================================================
      const startOfLastMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() - 1,
        1
      ).toISOString()

      // Payments: fetch the last ~13 months. Simpler filter: year >= last year.
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

      // Surface hard errors early
      if (accResult.error) throw accResult.error
      if (catResult.error) throw catResult.error
      if (txResult.error) throw txResult.error
      if (commResult.error) throw commResult.error

      // ============================================================
      // NORMALIZE ACCOUNTS
      // ============================================================
      let normalizedAccounts = (accResult.data || []).map(acc => {
        const { account_id, ...rest } = acc
        return { id: account_id, ...rest }
      })

      // ============================================================
      // SEEDING — ACCOUNTS
      // ============================================================
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

      // ============================================================
      // SEEDING — CATEGORIES
      // ============================================================
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

      // ============================================================
      // SEEDING — CLASSIFICATIONS
      // ============================================================
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

      // ============================================================
      // TRANSACTIONS, COMMITMENTS, MONTHLY EXPENSES, PAYMENTS
      // ============================================================
      setRecentTransactions(txResult.data || [])
      setCommitments(commResult.data || [])

      if (!monthResult.error) {
        setMonthlyExpenses(monthResult.data || [])
      }

      if (!paymentResult.error) {
        setCommitmentPayments(paymentResult.data || [])
      }

    } catch (error) {
      setError(error.message)
      showToast(`Failed to load data: ${error.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [user, showToast])

  return {
    accounts,
    recentTransactions,
    commitments,
    commitmentPayments,
    monthlyExpenses,
    categories,
    classifications,
    isLoading,
    error,
    setAccounts,
    setRecentTransactions,
    setCommitments,
    setCommitmentPayments,
    setMonthlyExpenses,
    setCategories,
    setClassifications,
    setIsLoading,
    setError,
    fetchAllData
  }
}