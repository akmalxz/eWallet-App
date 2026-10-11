// src/hooks/useOnboardingProgress.js
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { trackEvent } from '../lib/analytics'
import { logError } from '../lib/errorLogger'

/**
 * Computes onboarding checklist state from existing app data and
 * handles dismissal (writes profiles.onboarding_done = true).
 *
 * The checklist auto-dismisses once all steps are done, so users
 * who complete everything don't need to click the X.
 */
export function useOnboardingProgress({
  user,
  profile,
  recentTransactions,
  commitments,
  friends,
  refreshProfile,
}) {
  const steps = useMemo(
    () => [
      {
        id: 'transaction',
        label: 'Log your first transaction',
        hint: 'Tap + to record something',
        done: (recentTransactions?.length || 0) > 0,
      },
      {
        id: 'bill',
        label: 'Set up your first bill',
        hint: 'Track subscriptions and recurring payments',
        done: (commitments?.length || 0) > 0,
      },
      {
        id: 'username',
        label: 'Choose your username',
        hint: 'So friends can find you',
        done: !!profile?.username?.trim(),
      },
      {
        id: 'friend',
        label: 'Add your first friend',
        hint: 'Split bills together',
        done: (friends?.length || 0) > 0,
      },
    ],
    [recentTransactions, commitments, profile?.username, friends]
  )

  const completedCount = steps.filter((s) => s.done).length
  const totalCount = steps.length
  const allDone = completedCount === totalCount
  const shouldShow = !profile?.onboarding_done

  const dismiss = useCallback(async () => {
    if (!user?.id) return

    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_done: true })
      .eq('id', user.id)

    if (error) {
      // Surface the failure instead of silently swallowing it.
      logError(new Error('Onboarding dismiss failed: ' + error.message), {
        action: 'dismiss_onboarding',
        code: error.code,
        details: error.details,
      })
      return
    }

    trackEvent('onboarding_dismissed', { completed: completedCount })

    if (refreshProfile) await refreshProfile()
  }, [user?.id, completedCount, refreshProfile])

  // Auto-dismiss when all steps complete. Ref guard prevents a
  // loop if refreshProfile somehow fails and shouldShow stays true.
  const dismissCalledRef = useRef(false)
  useEffect(() => {
    if (dismissCalledRef.current) return
    if (!shouldShow) return
    if (!allDone) return
    dismissCalledRef.current = true
    dismiss()
  }, [shouldShow, allDone, dismiss])

  return {
    steps,
    completedCount,
    totalCount,
    allDone,
    shouldShow,
    dismiss,
  }
}