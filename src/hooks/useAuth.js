// src/hooks/useAuth.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  // ----------------------------------------------------------
  // Fetch profile (safe helper)
  // ----------------------------------------------------------
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, currency, timezone, theme, has_completed_onboarding, created_at, updated_at')
        .eq('id', userId)
        .single()
        
      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching user profile:', error.message)
      setProfile(null)
    }
  }, [])

  // ----------------------------------------------------------
  // Public refresh function for consumers (e.g. after edit)
  // ----------------------------------------------------------
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    await fetchProfile(user.id)
  }, [user?.id, fetchProfile])

  // ----------------------------------------------------------
  // Session + auth state listener
  // ----------------------------------------------------------
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