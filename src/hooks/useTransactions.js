// src/hooks/useTransactions.js
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export const useTransactions = (user, showToast) => {
  const [accounts, setAccounts] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [commitments, setCommitments] = useState([])
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
      const { error: testError } = await supabase
        .from('accounts')
        .select('id')
        .limit(1)
      
      if (testError) {
        throw new Error(`Database connection failed: ${testError.message}`)
      }

      // Fetch Accounts
      const accResult = await supabase
        .from('v_account_balances')
        .select('*')
        .eq('user_id', user.id) // Scoped
        .order('balance', { ascending: false })
      
      if (accResult.error) throw accResult.error
      
      const normalizedAccounts = (accResult.data || []).map(acc => {
        const { account_id, ...rest } = acc
        return { id: account_id, ...rest }
      })
      
      setAccounts(normalizedAccounts)

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
            .eq('user_id', user.id) // Scoped
            .order('balance', { ascending: false })
          
          const normalizedNewAccounts = (newAccounts || []).map(acc => {
            const { account_id, ...rest } = acc
            return { id: account_id, ...rest }
          })
          setAccounts(normalizedNewAccounts)
        }
      }

      // Fetch Categories
      const catResult = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id) // Scoped
        .order('name')
      
      if (catResult.error) throw catResult.error

      if (!catResult.data || catResult.data.length === 0) {
        const { data: mainCats, error: mainError } = await supabase
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
            .eq('user_id', user.id) // Scoped
            .order('name')
          setCategories(newCats || [])
        }
      } else {
        setCategories(catResult.data)
      }

      // Fetch Classifications
      const classResult = await supabase
        .from('classifications')
        .select('*')
        .eq('user_id', user.id) // Scoped

      if (classResult.error || !classResult.data || classResult.data.length === 0) {
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
              .eq('user_id', user.id) // Scoped
            setClassifications(refreshedClass || [])
          } else {
            throw new Error("Fallback execution")
          }
        } catch {
          setClassifications([
            { id: 'temp-hub', key_name: 'hub', label: 'Main Hub', icon_name: 'Landmark', color_class: 'text-blue-500', bg_class: 'bg-blue-50' },
            { id: 'temp-ewallet', key_name: 'ewallet', label: 'Daily eWallet', icon_name: 'Wallet', color_class: 'text-purple-500', bg_class: 'bg-purple-50' },
            { id: 'temp-digital', key_name: 'digital_bank', label: 'Digital Bank', icon_name: 'Activity', color_class: 'text-emerald-500', bg_class: 'bg-emerald-50' },
            { id: 'temp-savings', key_name: 'savings', label: 'Savings', icon_name: 'PiggyBank', color_class: 'text-amber-500', bg_class: 'bg-amber-50' }
          ])
        }
      } else {
        setClassifications(classResult.data)
      }

      // Fetch Transactions
      const txResult = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id) // Scoped
        .order('needs_review', { ascending: false })
        .order('transaction_date', { ascending: false })
        .limit(30)
      
      if (txResult.error) throw txResult.error
      setRecentTransactions(txResult.data || [])

      // Fetch Commitments
      const commResult = await supabase
        .from('commitments')
        .select('*')
        .eq('user_id', user.id) // Scoped
      
      if (commResult.error) throw commResult.error
      setCommitments(commResult.data || [])

      // Fetch Monthly Expenses
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const { data: monthData, error: monthError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id) // Scoped
        .is('destination_account_id', null)
        .gte('transaction_date', startOfMonth)
      
      if (!monthError) {
        setMonthlyExpenses(monthData || [])
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
    monthlyExpenses,
    categories,
    classifications,
    isLoading,
    error,
    setAccounts,
    setRecentTransactions,
    setCommitments,
    setMonthlyExpenses,
    setCategories,
    setClassifications,
    setIsLoading,
    setError,
    fetchAllData
  }
}