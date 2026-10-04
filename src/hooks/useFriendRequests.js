// src/hooks/useFriendRequests.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Loads the user's friendships (incoming + outgoing + accepted), enriches
 * them with the other party's profile, and keeps them in sync via realtime.
 *
 * Shared by the notification badge (Header) and NetworkPage. Every consumer
 * gets the same data with the same mutations.
 *
 * @param {object|null} user - Supabase auth user
 * @param {function} [showToast] - optional toast reporter for user-facing errors
 * @returns {{
 *   friendships: Array,
 *   requests: Array,
 *   sentRequests: Array,
 *   friends: Array,
 *   count: number,
 *   loading: boolean,
 *   error: string|null,
 *   accept: (id: string) => Promise<{success: boolean, error?: string}>,
 *   decline: (id: string) => Promise<{success: boolean, error?: string}>,
 *   cancel: (id: string) => Promise<{success: boolean, error?: string}>,
 *   removeFriend: (id: string) => Promise<{success: boolean, error?: string}>,
 *   refresh: () => Promise<void>,
 * }}
 */
export function useFriendRequests(user, showToast) {
  const userId = user?.id ?? null

  const [friendships, setFriendships] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Unique channel prefix so multiple hook instances (Header + NetworkPage)
  // don't collide on the same Supabase Realtime channel name.
  const instanceIdRef = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  )

  const fetchNetworkData = useCallback(
    async ({ silent = false } = {}) => {
      if (!userId) {
        setFriendships([])
        setLoading(false)
        setError(null)
        return
      }

      if (!silent) setLoading(true)
      setError(null)

      try {
        const { data: fsData, error: fsError } = await supabase
          .from('friendships')
          .select('*')
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

        if (fsError) throw fsError
        const list = fsData || []

        const otherIds = new Set()
        list.forEach(f => {
          if (f.requester_id !== userId) otherIds.add(f.requester_id)
          if (f.addressee_id !== userId) otherIds.add(f.addressee_id)
        })

        let profileMap = {}
        if (otherIds.size > 0) {
          const { data: profileData, error: pError } = await supabase.rpc(
            'get_profiles_by_ids',
            { user_ids: [...otherIds] }
          )
          if (pError) throw pError
          profileMap = Object.fromEntries(
            (profileData || []).map(p => [p.id, p])
          )
        }

        const enriched = list.map(f => {
          const otherId =
            f.requester_id === userId ? f.addressee_id : f.requester_id
          return {
            ...f,
            other_user: profileMap[otherId] || null
          }
        })

        setFriendships(enriched)
      } catch (err) {
        const message = err?.message || 'Failed to load network'
        setError(message)
        if (showToast && !silent) {
          showToast('Failed to load network: ' + message, 'error')
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [userId, showToast]
  )

  // Initial fetch, and refetch whenever the signed-in user changes.
  useEffect(() => {
    fetchNetworkData()
  }, [fetchNetworkData])

  // Realtime — keep the list in sync with Supabase.
  // Two channels, one per filter direction, since Supabase realtime filters
  // don't support `or`. Each fires on any change and triggers a silent refetch.
  useEffect(() => {
    if (!userId) return

    const handleChange = () => fetchNetworkData({ silent: true })
    const suffix = instanceIdRef.current

    const incoming = supabase
      .channel(`friendships_in:${userId}:${suffix}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `addressee_id=eq.${userId}`
        },
        handleChange
      )
      .subscribe()

    const outgoing = supabase
      .channel(`friendships_out:${userId}:${suffix}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `requester_id=eq.${userId}`
        },
        handleChange
      )
      .subscribe()

    return () => {
      supabase.removeChannel(incoming)
      supabase.removeChannel(outgoing)
    }
  }, [userId, fetchNetworkData])

  // Derived lists
  const requests = useMemo(
    () =>
      friendships.filter(
        f => f.status === 'pending' && f.addressee_id === userId
      ),
    [friendships, userId]
  )

  const sentRequests = useMemo(
    () =>
      friendships.filter(
        f => f.status === 'pending' && f.requester_id === userId
      ),
    [friendships, userId]
  )

  const friends = useMemo(
    () => friendships.filter(f => f.status === 'accepted'),
    [friendships]
  )

  // Mutations
  const accept = useCallback(
    async (friendshipId) => {
      try {
        const { error: updateError } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', friendshipId)
        if (updateError) throw updateError
        if (showToast) showToast('Friend request accepted!', 'success')
        await fetchNetworkData({ silent: true })
        return { success: true }
      } catch (err) {
        if (showToast) showToast('Failed to accept: ' + err.message, 'error')
        return { success: false, error: err.message }
      }
    },
    [showToast, fetchNetworkData]
  )

  const decline = useCallback(
    async (friendshipId) => {
      try {
        const { error: deleteError } = await supabase
          .from('friendships')
          .delete()
          .eq('id', friendshipId)
        if (deleteError) throw deleteError
        if (showToast) showToast('Request declined', 'success')
        await fetchNetworkData({ silent: true })
        return { success: true }
      } catch (err) {
        if (showToast) showToast('Failed: ' + err.message, 'error')
        return { success: false, error: err.message }
      }
    },
    [showToast, fetchNetworkData]
  )

  const cancel = useCallback(
    async (friendshipId) => {
      try {
        const { error: deleteError } = await supabase
          .from('friendships')
          .delete()
          .eq('id', friendshipId)
        if (deleteError) throw deleteError
        if (showToast) showToast('Request cancelled', 'success')
        await fetchNetworkData({ silent: true })
        return { success: true }
      } catch (err) {
        if (showToast) showToast('Failed to cancel: ' + err.message, 'error')
        return { success: false, error: err.message }
      }
    },
    [showToast, fetchNetworkData]
  )

  const removeFriend = useCallback(
    async (friendshipId) => {
      try {
        const { error: deleteError } = await supabase
          .from('friendships')
          .delete()
          .eq('id', friendshipId)
        if (deleteError) throw deleteError
        if (showToast) showToast('Friend removed', 'success')
        await fetchNetworkData({ silent: true })
        return { success: true }
      } catch (err) {
        if (showToast) showToast('Failed: ' + err.message, 'error')
        return { success: false, error: err.message }
      }
    },
    [showToast, fetchNetworkData]
  )

  return {
    friendships,
    requests,
    sentRequests,
    friends,
    count: requests.length,
    loading,
    error,
    accept,
    decline,
    cancel,
    removeFriend,
    refresh: fetchNetworkData
  }
}