// src/hooks/useErrorMonitor.js
import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Admin-only. Subscribes to INSERTs on error_log and calls
 * onError() for each new row.
 *
 * Only activates when the signed-in user matches VITE_ADMIN_USER_ID
 * — everyone else is a no-op.
 *
 * Requires:
 *   - profiles.is_admin = true for the admin's row
 *   - error_log table in the supabase_realtime publication
 *   - VITE_ADMIN_USER_ID set in .env
 */
export function useErrorMonitor(user, onError) {
  useEffect(() => {
    const adminId = import.meta.env.VITE_ADMIN_USER_ID

    if (!user?.id || !adminId) return
    if (user.id !== adminId) return

    const channel = supabase
      .channel('error_log_admin')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'error_log',
        },
        (payload) => {
          if (onError) onError(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, onError])
}