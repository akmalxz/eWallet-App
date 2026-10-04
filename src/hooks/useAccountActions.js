// src/hooks/useAccountActions.js
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAccountActions({
  user,
  accounts,
  currentView,
  setCurrentView,
  fetchAllData,
  showToast
}) {
  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.is_archived),
    [accounts]
  )

  const sortedAccounts = useMemo(() => {
    return [...activeAccounts].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      const aOrder = a.sort_order ?? 0
      const bOrder = b.sort_order ?? 0
      return aOrder - bOrder
    })
  }, [activeAccounts])

  const [selectedAccount, setSelectedAccount] = useState(null)
  const [requestedModal, setRequestedModal] = useState(null)

  // Clear the requested profile modal whenever we leave the profile view.
  useEffect(() => {
    if (currentView !== 'profile') setRequestedModal(null)
  }, [currentView])

  // ------------------------------------------------------------------
  // Routing helpers — move between views, sometimes pre-selecting a target
  // ------------------------------------------------------------------
  const goToAddAccount = () => {
    setRequestedModal('banks')
    setCurrentView('profile')
  }

  const goToLogTransaction = (account) => {
    setSelectedAccount(account)
    setCurrentView('log')
  }

  const goToManageAccount = (account) => {
    setSelectedAccount(account)
    setRequestedModal('banks')
    setCurrentView('profile')
  }

  // ------------------------------------------------------------------
  // Pin — only one account at a time
  // ------------------------------------------------------------------
  const togglePin = async (account) => {
    try {
      if (!account.is_pinned) {
        const otherPinned = accounts.find((a) => a.id !== account.id && a.is_pinned)
        if (otherPinned) {
          showToast(
            `Only one account can be pinned. Unpin "${otherPinned.account_name}" first.`,
            'warning'
          )
          return
        }
      }

      const { data, error } = await supabase
        .from('accounts')
        .update({ is_pinned: !account.is_pinned })
        .eq('id', account.id)
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Pin failed — no rows affected. Check RLS on accounts.')
      }

      showToast(account.is_pinned ? 'Account unpinned' : 'Account pinned to top', 'success')
      fetchAllData()
    } catch (err) {
      showToast('Error toggling pin: ' + err.message, 'error')
    }
  }

  // ------------------------------------------------------------------
  // Move — swap an account up/down in sort order
  // ------------------------------------------------------------------
  const moveAccount = async (accountId, direction) => {
    if (!user) return

    const list = sortedAccounts
    const idx = list.findIndex((a) => a.id === accountId)
    if (idx === -1) return

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= list.length) return

    const current = list[idx]
    const target = list[targetIdx]
    if (!!current.is_pinned !== !!target.is_pinned) return

    const newList = [...list]
    newList[idx] = target
    newList[targetIdx] = current

    try {
      const results = await Promise.all(
        newList.map((a, i) =>
          supabase.from('accounts').update({ sort_order: i }).eq('id', a.id).select()
        )
      )
      const failed = results.find((r) => r.error || !r.data || r.data.length === 0)
      if (failed) throw new Error('Reorder failed — no rows updated. Check RLS on accounts.')
      fetchAllData()
    } catch (err) {
      showToast('Error reordering: ' + err.message, 'error')
    }
  }

  return {
    activeAccounts,
    sortedAccounts,
    selectedAccount,
    requestedModal,
    goToAddAccount,
    goToLogTransaction,
    goToManageAccount,
    togglePin,
    moveAccount
  }
}