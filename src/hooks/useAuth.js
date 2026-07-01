// src/hooks/useAuth.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { 
        setUser(session.user); 
        setIsAuthenticated(true) 
      }
      setIsAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((async (_event, session) => {
      if (session?.user) { 
        setUser(session.user)
        setIsAuthenticated(true) 
      } else { 
        setUser(null); 
        setIsAuthenticated(false); 
      }
    }))
    return () => subscription.unsubscribe()
  }, [])

  return { user, setUser, isAuthenticated, isAuthLoading }
}