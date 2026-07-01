// src/hooks/useTransactions.js
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export const useTransactions = (user, showToast) => {
  const [accounts, setAccounts] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [commitments, setCommitments] = useState([])
  const [gxExpenses, setGxExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [classifications, setClassifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAllData = useCallback(async () => {
    if (!user) {
      console.log('⏳ No user yet, skipping fetch')
      setIsLoading(false)
      return
    }

    console.log('🔄 Fetching data for user:', user.id)
    setIsLoading(true)
    setError(null)
    
    try {
      // Test connection first
      console.log('📡 Testing database connection...')
      const { error: testError } = await supabase
        .from('accounts')
        .select('id')
        .limit(1)
      
      if (testError) {
        console.error('❌ Database connection test failed:', testError)
        throw new Error(`Database connection failed: ${testError.message}`)
      }
      console.log('✅ Database connection successful')

      // Fetch accounts - NORMALIZE account_id to id
      console.log('📊 Fetching accounts...')
      const accResult = await supabase
        .from('v_account_balances')
        .select('*')
        .order('balance', { ascending: false })
      
      if (accResult.error) {
        console.error('❌ Accounts fetch error:', accResult.error)
        throw accResult.error
      }
      
      // ✅ NORMALIZE: Rename account_id to id for consistent usage
      const normalizedAccounts = (accResult.data || []).map(acc => {
        const { account_id, ...rest } = acc
        return {
          id: account_id,
          ...rest
        }
      })
      
      console.log(`✅ Accounts loaded: ${normalizedAccounts.length} found`)
      setAccounts(normalizedAccounts)

      // Create default accounts if none exist
      if (normalizedAccounts.length === 0) {
        console.log('📝 No accounts found, creating defaults...')
        const defaultAccounts = [
          { user_id: user.id, account_name: 'Maybank', classification: 'hub' },
          { user_id: user.id, account_name: 'TNG eWallet', classification: 'ewallet' },
          { user_id: user.id, account_name: 'GX Bank', classification: 'digital_bank' },
          { user_id: user.id, account_name: 'Bank Rakyat', classification: 'savings' }
        ]
        
        const { error: insertError } = await supabase
          .from('accounts')
          .insert(defaultAccounts)
        
        if (insertError) {
          console.error('❌ Failed to create default accounts:', insertError)
        } else {
          console.log('✅ Default accounts created')
          // Re-fetch with normalization
          const { data: newAccounts } = await supabase
            .from('v_account_balances')
            .select('*')
            .order('balance', { ascending: false })
          
          const normalizedNewAccounts = (newAccounts || []).map(acc => {
            const { account_id, ...rest } = acc
            return { id: account_id, ...rest }
          })
          setAccounts(normalizedNewAccounts)
        }
      }

      // Fetch categories
      console.log('📊 Fetching categories...')
      const catResult = await supabase
        .from('categories')
        .select('*')
        .order('name')
      
      if (catResult.error) {
        console.error('❌ Categories fetch error:', catResult.error)
        throw catResult.error
      }
      console.log(`✅ Categories loaded: ${catResult.data?.length || 0} found`)

      if (!catResult.data || catResult.data.length === 0) {
        console.log('📝 No categories found, creating defaults...')
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
        
        if (mainError) {
          console.error('❌ Failed to create default categories:', mainError)
        } else if (mainCats) {
          console.log('✅ Default categories created')
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
            .order('name')
          setCategories(newCats || [])
        }
      } else {
        setCategories(catResult.data)
      }

      // Fetch classifications - HANDLE 403 GRACEFULLY
      console.log('📊 Fetching classifications...')
      const classResult = await supabase
        .from('classifications')
        .select('*')

      if (classResult.error) {
        console.warn('⚠️ Classifications fetch warning:', classResult.error.message)
        const fallbackClass = [
          { id: 'temp-hub', key_name: 'hub', label: 'Main Hub', icon_name: 'Landmark', color_class: 'text-blue-500', bg_class: 'bg-blue-50' },
          { id: 'temp-ewallet', key_name: 'ewallet', label: 'Daily eWallet', icon_name: 'Wallet', color_class: 'text-purple-500', bg_class: 'bg-purple-50' },
          { id: 'temp-digital', key_name: 'digital_bank', label: 'Digital Bank', icon_name: 'Activity', color_class: 'text-emerald-500', bg_class: 'bg-emerald-50' },
          { id: 'temp-savings', key_name: 'savings', label: 'Savings', icon_name: 'PiggyBank', color_class: 'text-amber-500', bg_class: 'bg-amber-50' }
        ]
        setClassifications(fallbackClass)
      } else {
        console.log(`✅ Classifications loaded: ${classResult.data?.length || 0} found`)
        
        if (!classResult.data || classResult.data.length === 0) {
          console.log('📝 No classifications found, creating defaults...')
          try {
            const defaultClass = [
              { user_id: user.id, key_name: 'hub', label: 'Main Hub', icon_name: 'Landmark', color_class: 'text-blue-500', bg_class: 'bg-blue-50' },
              { user_id: user.id, key_name: 'ewallet', label: 'Daily eWallet', icon_name: 'Wallet', color_class: 'text-purple-500', bg_class: 'bg-purple-50' },
              { user_id: user.id, key_name: 'digital_bank', label: 'Digital Bank', icon_name: 'Activity', color_class: 'text-emerald-500', bg_class: 'bg-emerald-50' },
              { user_id: user.id, key_name: 'savings', label: 'Savings', icon_name: 'PiggyBank', color_class: 'text-amber-500', bg_class: 'bg-amber-50' }
            ]
            
            const { error: insertError } = await supabase
              .from('classifications')
              .insert(defaultClass)
            
            if (insertError) {
              console.warn('⚠️ Could not create default classifications (RLS may be disabled):', insertError.message)
              const fallbackClass = [
                { id: 'temp-hub', key_name: 'hub', label: 'Main Hub', icon_name: 'Landmark', color_class: 'text-blue-500', bg_class: 'bg-blue-50' },
                { id: 'temp-ewallet', key_name: 'ewallet', label: 'Daily eWallet', icon_name: 'Wallet', color_class: 'text-purple-500', bg_class: 'bg-purple-50' },
                { id: 'temp-digital', key_name: 'digital_bank', label: 'Digital Bank', icon_name: 'Activity', color_class: 'text-emerald-500', bg_class: 'bg-emerald-50' },
                { id: 'temp-savings', key_name: 'savings', label: 'Savings', icon_name: 'PiggyBank', color_class: 'text-amber-500', bg_class: 'bg-amber-50' }
              ]
              setClassifications(fallbackClass)
            } else {
              console.log('✅ Default classifications created')
              const { data: refreshedClass } = await supabase
                .from('classifications')
                .select('*')
              setClassifications(refreshedClass || [])
            }
          } catch (err) {
            console.warn('⚠️ Error creating classifications:', err.message)
            const fallbackClass = [
              { id: 'temp-hub', key_name: 'hub', label: 'Main Hub', icon_name: 'Landmark', color_class: 'text-blue-500', bg_class: 'bg-blue-50' },
              { id: 'temp-ewallet', key_name: 'ewallet', label: 'Daily eWallet', icon_name: 'Wallet', color_class: 'text-purple-500', bg_class: 'bg-purple-50' },
              { id: 'temp-digital', key_name: 'digital_bank', label: 'Digital Bank', icon_name: 'Activity', color_class: 'text-emerald-500', bg_class: 'bg-emerald-50' },
              { id: 'temp-savings', key_name: 'savings', label: 'Savings', icon_name: 'PiggyBank', color_class: 'text-amber-500', bg_class: 'bg-amber-50' }
            ]
            setClassifications(fallbackClass)
          }
        } else {
          setClassifications(classResult.data)
        }
      }

      // Fetch transactions
      console.log('📊 Fetching transactions...')
      const txResult = await supabase
        .from('transactions')
        .select('*')
        .order('needs_review', { ascending: false })
        .order('transaction_date', { ascending: false })
        .limit(30)
      
      if (txResult.error) {
        console.error('❌ Transactions fetch error:', txResult.error)
        throw txResult.error
      }
      console.log(`✅ Transactions loaded: ${txResult.data?.length || 0} found`)
      setRecentTransactions(txResult.data || [])

      // Fetch commitments
      console.log('📊 Fetching commitments...')
      const commResult = await supabase
        .from('commitments')
        .select('*')
      
      if (commResult.error) {
        console.error('❌ Commitments fetch error:', commResult.error)
        throw commResult.error
      }
      console.log(`✅ Commitments loaded: ${commResult.data?.length || 0} found`)
      setCommitments(commResult.data || [])

      // Fetch GX expenses - ✅ Use normalized id
      const digitalBankId = normalizedAccounts.find(a => a.classification === 'digital_bank')?.id
      if (digitalBankId) {
        console.log('📊 Fetching GX expenses...')
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        const { data: gxData } = await supabase
          .from('transactions')
          .select('*')
          .eq('source_account_id', digitalBankId)
          .is('destination_account_id', null)
          .gte('transaction_date', startOfMonth)
        setGxExpenses(gxData || [])
        console.log(`✅ GX expenses loaded: ${gxData?.length || 0} found`)
      }

      console.log('✅ All data loaded successfully!')
      
    } catch (error) {
      console.error('❌ Error fetching data:', error)
      setError(error.message)
      showToast(`Failed to load data: ${error.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [user, showToast])

  return {
    // State
    accounts,
    recentTransactions,
    commitments,
    gxExpenses,
    categories,
    classifications,
    isLoading,
    error,
    // Setters
    setAccounts,
    setRecentTransactions,
    setCommitments,
    setGxExpenses,
    setCategories,
    setClassifications,
    setIsLoading,
    setError,
    // Actions
    fetchAllData
  }
}