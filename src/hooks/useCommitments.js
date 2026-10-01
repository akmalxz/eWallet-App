// src/hooks/useCommitments.js
import { useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export const useCommitments = ({ user, commitments = [], fetchAllData, showToast }) => {
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  const guard = useCallback(async (fn) => {
    if (savingRef.current) return { success: false, error: 'Already saving' }
    savingRef.current = true
    setSaving(true)
    try {
      return await fn()
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [])

  const addCommitment = useCallback(
    (payload) =>
      guard(async () => {
        if (!user) return { success: false, error: 'Not signed in' }
        try {
          const { error } = await supabase.from('commitments').insert([
            {
              user_id: user.id,
              name: payload.name,
              amount: payload.amount,
              due_day_of_month: payload.due_day_of_month,
              account_id: payload.account_id,
              is_active: true
            }
          ])
          if (error) throw error
          showToast('Bill added', 'success')
          await fetchAllData()
          return { success: true }
        } catch (err) {
          showToast('Error: ' + err.message, 'error')
          return { success: false, error: err.message }
        }
      }),
    [guard, user, fetchAllData, showToast]
  )

  const updateCommitment = useCallback(
    (id, payload) =>
      guard(async () => {
        try {
          const { data, error } = await supabase
            .from('commitments')
            .update({
              name: payload.name,
              amount: payload.amount,
              due_day_of_month: payload.due_day_of_month,
              account_id: payload.account_id
            })
            .eq('id', id)
            .select()
          if (error) throw error
          if (!data || data.length === 0) throw new Error('No rows updated — check RLS.')
          showToast('Bill updated', 'success')
          await fetchAllData()
          return { success: true }
        } catch (err) {
          showToast('Error: ' + err.message, 'error')
          return { success: false, error: err.message }
        }
      }),
    [guard, fetchAllData, showToast]
  )

  const deleteCommitment = useCallback(
    (id) =>
      guard(async () => {
        try {
          const { error } = await supabase.from('commitments').delete().eq('id', id)
          if (error) throw error
          showToast('Bill deleted', 'success')
          await fetchAllData()
          return { success: true }
        } catch (err) {
          showToast('Error: ' + err.message, 'error')
          return { success: false, error: err.message }
        }
      }),
    [guard, fetchAllData, showToast]
  )

  const setActive = useCallback(
    (id, isActive) =>
      guard(async () => {
        try {
          const { error } = await supabase
            .from('commitments')
            .update({ is_active: isActive })
            .eq('id', id)
          if (error) throw error
          showToast(isActive ? 'Bill reactivated' : 'Bill paused', 'success')
          await fetchAllData()
          return { success: true }
        } catch (err) {
          showToast('Error: ' + err.message, 'error')
          return { success: false, error: err.message }
        }
      }),
    [guard, fetchAllData, showToast]
  )

  const pauseCommitment = useCallback((id) => setActive(id, false), [setActive])
  const reactivateCommitment = useCallback((id) => setActive(id, true), [setActive])

  const markPaid = useCallback(
    (commitmentId, { periodYear, periodMonth, amount, paidDate }) =>
      guard(async () => {
        try {
          const { error: rpcError } = await supabase.rpc('mark_commitment_paid', {
            p_commitment_id: commitmentId,
            p_period_year: periodYear,
            p_period_month: periodMonth,
            p_amount: amount,
            p_paid_date: paidDate
          })
          if (rpcError) throw rpcError
          const c = commitments.find((x) => x.id === commitmentId)
          showToast(`${c?.name || 'Bill'} marked as paid`, 'success')
          await fetchAllData()
          return { success: true }
        } catch (err) {
          showToast('Error: ' + err.message, 'error')
          return { success: false, error: err.message }
        }
      }),
    [guard, commitments, fetchAllData, showToast]
  )

  const skip = useCallback(
    (commitmentId, periodYear, periodMonth) =>
      guard(async () => {
        try {
          const { error: rpcError } = await supabase.rpc('skip_commitment', {
            p_commitment_id: commitmentId,
            p_period_year: periodYear,
            p_period_month: periodMonth
          })
          if (rpcError) throw rpcError
          const c = commitments.find((x) => x.id === commitmentId)
          showToast(`${c?.name || 'Bill'} skipped for this month`, 'success')
          await fetchAllData()
          return { success: true }
        } catch (err) {
          showToast('Error: ' + err.message, 'error')
          return { success: false, error: err.message }
        }
      }),
    [guard, commitments, fetchAllData, showToast]
  )

  const undo = useCallback(
    (commitmentId, periodYear, periodMonth) =>
      guard(async () => {
        try {
          const { data, error: rpcError } = await supabase.rpc('undo_commitment_payment', {
            p_commitment_id: commitmentId,
            p_period_year: periodYear,
            p_period_month: periodMonth
          })
          if (rpcError) throw rpcError
          const c = commitments.find((x) => x.id === commitmentId)
          const name = c?.name || 'Bill'
          if (data === 'not_found') {
            showToast('No matching payment was found, the bill was reset', 'warning')
          } else if (data === 'expense_removed') {
            showToast(`${name} reset to unpaid`, 'success')
          } else if (data === 'skip_removed') {
            showToast(`${name} unskipped`, 'success')
          }
          await fetchAllData()
          return { success: true }
        } catch (err) {
          showToast('Error undoing: ' + err.message, 'error')
          return { success: false, error: err.message }
        }
      }),
    [guard, commitments, fetchAllData, showToast]
  )

  return {
    saving,
    addCommitment,
    updateCommitment,
    deleteCommitment,
    pauseCommitment,
    reactivateCommitment,
    markPaid,
    skip,
    undo
  }
}