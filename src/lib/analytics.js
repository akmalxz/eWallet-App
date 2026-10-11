// src/lib/analytics.js
import { supabase } from './supabaseClient'

// Session-scoped anonymous ID so we can distinguish "same browser
// before login" from "different browser". Persisted for the tab only.
const ANON_ID = (() => {
  try {
    const existing = sessionStorage.getItem('fs:anonId')
    if (existing) return existing
    const fresh = crypto.randomUUID()
    sessionStorage.setItem('fs:anonId', fresh)
    return fresh
  } catch {
    return 'anon'
  }
})()

/**
 * Fire-and-forget event tracker. Never throws. Rate-limited
 * to protect Supabase from pathological cases.
 */
let eventsThisMinute = 0
let windowStart = Date.now()
const MAX_PER_MINUTE = 60

export async function trackEvent(name, props = {}) {
  if (!name) return

  const now = Date.now()
  if (now - windowStart > 60_000) {
    eventsThisMinute = 0
    windowStart = now
  }
  if (eventsThisMinute >= MAX_PER_MINUTE) return
  eventsThisMinute += 1

  try {
    const { data } = await supabase.auth.getSession()
    const userId = data?.session?.user?.id ?? null

    // Events from signed-out users still get logged (userId = null)
    // but only for onboarding-relevant actions. Skip noise.
    if (!userId) {
      // Only track signup funnel events for anonymous users
      const anonymousAllowed = ['auth_viewed', 'signup_attempted']
      if (!anonymousAllowed.includes(name)) return
    }

    await supabase.from('user_events').insert({
      user_id: userId,
      name,
      props: { ...props, anonId: ANON_ID },
    })
  } catch {
    // Analytics must never break the app.
  }
}