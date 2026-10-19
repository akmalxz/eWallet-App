// src/hooks/useLedgerMutations.js
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useLedgerMutations({
  user,
  showToast,
  setRecentTransactions,
  setCommitments,
  setCommitmentPayments,
  fetchRecentTransactions, // <-- Added
  fetchAccounts,           // <-- Added
  fetchMonthlyData         // <-- Added
}) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const busyRef = useRef(false)

  const refreshLedger = useCallback(async (showToastMessage = true) => {
    if (busyRef.current || !user) return
    busyRef.current = true
    setIsRefreshing(true)
    try {
      // We keep this local fetch because it's specifically refreshing the ledger view
      const [txResult, commResult, payResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .order('needs_review', { ascending: false })
          .order('transaction_date', { ascending: false })
          .limit(30),
        supabase.from('commitments').select('*'),
        supabase
          .from('commitments_payments')
          .select('id, commitment_id, period_year, period_month, status, transaction_id, created_at')
          .gte('period_year', new Date().getFullYear() - 1)
      ])
      if (txResult.error) throw txResult.error
      if (commResult.error) throw commResult.error
      if (payResult.error) throw payResult.error
      setRecentTransactions(txResult.data || [])
      setCommitments(commResult.data || [])
      setCommitmentPayments(payResult.data || [])
      if (showToastMessage) showToast('Ledger refreshed successfully!', 'success')
    } catch (err) {
      if (showToastMessage) showToast('Failed to refresh ledger: ' + err.message, 'error')
    } finally {
      busyRef.current = false
      setIsRefreshing(false)
    }
  }, [user, showToast, setRecentTransactions, setCommitments, setCommitmentPayments])

  useEffect(() => {
    if (!user) return
    const id = setInterval(() => refreshLedger(false), 60000)
    return () => clearInterval(id)
  }, [user, refreshLedger])

  const approveTransaction = useCallback(async (id, updatedCategory, updatedDate = null) => {
    if (!updatedCategory || updatedCategory === 'uncategorized') {
      return showToast('Please select a category before approving', 'warning')
    }
    try {
      const updatePayload = { needs_review: false, category: updatedCategory }
      if (updatedDate) {
        updatePayload.transaction_date = new Date(`${updatedDate}T12:00:00`).toISOString()
      }
      const { error } = await supabase.from('transactions').update(updatePayload).eq('id', id)
      if (error) throw error
      showToast('Transaction approved successfully!', 'success')
      
      await Promise.all([
        fetchRecentTransactions(),
        fetchMonthlyData()
      ])
    } catch (err) {
      showToast('Error approving transaction: ' + err.message, 'error')
    }
  }, [showToast, fetchRecentTransactions, fetchMonthlyData])

  const deleteTransaction = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      showToast('Transaction deleted successfully', 'success')
      
      await Promise.all([
        fetchRecentTransactions(),
        fetchAccounts(), // Deleting a transaction changes account balances
        fetchMonthlyData()
      ])
    } catch (err) {
      showToast('Error deleting transaction: ' + err.message, 'error')
    }
  }, [showToast, fetchRecentTransactions, fetchAccounts, fetchMonthlyData])

  const editTransaction = useCallback(async (id, updatedData) => {
    try {
      if (updatedData.amount <= 0) return showToast('Amount must be greater than 0', 'error')
      if (!updatedData.description || updatedData.description.trim().length < 2) {
        return showToast('Description must be at least 2 characters', 'error')
      }
      if (!updatedData.category || updatedData.category === 'uncategorized') {
        return showToast('Please select a valid category', 'error')
      }
      const updatePayload = {
        description: updatedData.description.trim(),
        category: updatedData.category,
        amount: updatedData.amount,
        source_account_id: updatedData.source_account_id || null,
        destination_account_id: updatedData.destination_account_id || null,
        needs_review: false
      }
      if (updatedData.transaction_date) {
        updatePayload.transaction_date = new Date(`${updatedData.transaction_date}T12:00:00`).toISOString()
      }
      const { error } = await supabase.from('transactions').update(updatePayload).eq('id', id).select()
      if (error) throw error
      showToast('Transaction updated successfully!', 'success')
      
      await Promise.all([
        fetchRecentTransactions(),
        fetchAccounts(),
        fetchMonthlyData()
      ])
    } catch (err) {
      showToast(`Error updating transaction: ${err.message || 'Unknown error'}`, 'error')
    }
  }, [showToast, fetchRecentTransactions, fetchAccounts, fetchMonthlyData])

  return {
    isRefreshing,
    refreshLedger,
    approveTransaction,
    deleteTransaction,
    editTransaction
  }
}