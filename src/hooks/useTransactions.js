// src/hooks/useTransactions.js
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { enrichReceivablesByMonth } from '../utils/receivables'

export const useTransactions = (user, showToast) => {
  const [accounts, setAccounts] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [commitments, setCommitments] = useState([])
  const [commitmentPayments, setCommitmentPayments] = useState([])
  const [monthlyExpenses, setMonthlyExpenses] = useState([])
  const [pendingReceivables, setPendingReceivables] = useState([])
  const [categories, setCategories] = useState([])
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
      const startOfLastMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() - 1,
        1
      ).toISOString()

      const minPaymentYear = new Date().getFullYear() - 1

      const [
        accResult,
        catResult,
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

        // monthlyExpenses — feeds burn rate, cash flow, and the
        // CashFlowHeatmap drilldown. The drilldown renders tx.description
        // and sorts by transaction_date with created_at as a tiebreaker,
        // so both columns must be selected even though the engines
        // themselves don't read them.
        supabase
          .from('transactions')
          .select('id, amount, source_account_id, destination_account_id, category, transaction_date, description, needs_review, created_at, metadata')
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
      // ACCOUNTS — normalize the view's account_id → id, and fold the
      // opening balance into the effective balance.
      //
      // The view returns two separate numbers:
      //   balance          — sum(transactions in) − sum(transactions out)
      //   starting_balance — the opening amount the user entered
      //
      // Every consumer (account cards, burn rate, commitment radar,
      // cash flow heatmap) reads `account.balance`. Rather than push
      // the addition into each of them, we compute the effective
      // total once, here, and expose it as `balance`.
      //
      // The original transaction-derived amount is discarded — nothing
      // downstream needs it as a distinct value. If that changes,
      // expose it as a separate `transaction_balance` field.
      // ------------------------------------------------------------
      const normalizedAccounts = (accResult.data || []).map(acc => {
        const { account_id, starting_balance, ...rest } = acc
        return {
          id: account_id,
          ...rest,
          starting_balance: Number(starting_balance) || 0,
          balance: (Number(rest.balance) || 0) + (Number(starting_balance) || 0)
        }
      })

      setAccounts(normalizedAccounts)
      setCategories(catResult.data || [])
      setRecentTransactions(txResult.data || [])
      setCommitments(commResult.data || [])

      if (!monthResult.error) {
        setMonthlyExpenses(monthResult.data || [])
      }

      if (!paymentResult.error) {
        setCommitmentPayments(paymentResult.data || [])
      }

      // ------------------------------------------------------------
      // PENDING RECEIVABLES
      // Debts owed TO this user, enriched with their session's month
      // so the burn-rate engine can scope which receivables apply to
      // the current calendar month.
      //
      // Enrichment is a pure helper in utils/receivables.js so the
      // month-matching logic is testable without mocking Supabase.
      // ------------------------------------------------------------
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

          setPendingReceivables(enrichReceivablesByMonth(debts, sessions))
        } else {
          setPendingReceivables([])
        }
      } catch {
        setPendingReceivables([])
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
    pendingReceivables,
    categories,
    isLoading,
    error,
    setAccounts,
    setRecentTransactions,
    setCommitments,
    setCommitmentPayments,
    setMonthlyExpenses,
    setPendingReceivables,
    setCategories,
    setIsLoading,
    setError,
    fetchAllData
  }
}