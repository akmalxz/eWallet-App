// src/hooks/useAuth.js
import { useState, useEffect, useCallback, useRef } from 'react' // Added useRef
import { supabase } from '../lib/supabaseClient'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  // Guard against double-fetching on mount (StrictMode + Auth listeners)
  const fetchedProfileIdRef = useRef(null)

  const fetchProfile = useCallback(async (userId, force = false) => {
    if (!userId) {
      setProfile(null)
      fetchedProfileIdRef.current = null
      return
    }

    // If we already fetched this user's profile and aren't forcing a refresh, skip.
    if (!force && fetchedProfileIdRef.current === userId) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, email, currency, timezone, theme, avatar_kind, avatar_value, avatar_color, has_completed_onboarding, onboarding_done, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error
      setProfile(data || null)
      fetchedProfileIdRef.current = userId
    } catch (error) {
      console.error('Error fetching user profile:', error.message)
      setProfile(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    await fetchProfile(user.id, true) // Force fetch on manual refresh
  }, [user?.id, fetchProfile])

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setIsAuthenticated(true)
        fetchProfile(session.user.id)
      } else {
        setIsAuthLoading(false)
      }
    })

    // 2. Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user)
          setIsAuthenticated(true)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
          setIsAuthenticated(false)
          fetchedProfileIdRef.current = null // Clear on logout
        }
        setIsAuthLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  return {
    user,
    profile,
    refreshProfile,
    isAuthenticated,
    isAuthLoading
  }
}