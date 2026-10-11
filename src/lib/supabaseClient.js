// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// ─────────────────────────────────────────────────────────────
// Session expiry tracking.
//
// `sessionExpired.consume()` returns true once if the last SIGNED_OUT
// event was triggered by an expired refresh token (i.e. the user did
// not click sign-out themselves).
//
// How it works:
//   - We track whether the user was signed in before the SIGNED_OUT
//     event fired.
//   - On SIGNOUT with a prior session, we set a sessionStorage flag.
//   - Consumers call .consume() to check-and-clear.
//
// Explicit sign-out handlers don't need to do anything — the flag
// is only set if the previous state had a signed-in user AND the
// sign-out wasn't triggered by an explicit `supabase.auth.signOut()`.
// (We approximate "explicit" by checking if signOut was recently
// called; see SIGNING_OUT marker below.)
// ─────────────────────────────────────────────────────────────

const EXPIRED_KEY = 'fs:sessionExpired'
const SIGNING_OUT_KEY = 'fs:signingOut'

let wasSignedIn = false
let userInitiatedSignOut = false

// Track initial session state
supabase.auth.getSession().then(({ data }) => {
  wasSignedIn = !!data?.session?.user
})

// Wrap signOut so we can mark the operation as user-initiated
const originalSignOut = supabase.auth.signOut.bind(supabase.auth)
supabase.auth.signOut = async (...args) => {
  userInitiatedSignOut = true
  try { sessionStorage.setItem(SIGNING_OUT_KEY, '1') } catch {}
  return originalSignOut(...args)
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN') {
    wasSignedIn = true
    userInitiatedSignOut = false
    try {
      sessionStorage.removeItem(EXPIRED_KEY)
      sessionStorage.removeItem(SIGNING_OUT_KEY)
    } catch {}
  }

  if (event === 'SIGNED_OUT') {
    const explicit = userInitiatedSignOut ||
      (() => {
        try { return sessionStorage.getItem(SIGNING_OUT_KEY) === '1' }
        catch { return false }
      })()

    if (wasSignedIn && !explicit) {
      try { sessionStorage.setItem(EXPIRED_KEY, '1') } catch {}
    }

    wasSignedIn = false
    userInitiatedSignOut = false
    try { sessionStorage.removeItem(SIGNING_OUT_KEY) } catch {}
  }
})

export const sessionExpired = {
  consume() {
    try {
      const wasExpired = sessionStorage.getItem(EXPIRED_KEY) === '1'
      sessionStorage.removeItem(EXPIRED_KEY)
      return wasExpired
    } catch {
      return false
    }
  },
}