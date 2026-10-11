// src/lib/errorLogger.js
import { supabase } from './supabaseClient'

// ─────────────────────────────────────────────────────────────
// Client-side rate limiting + deduplication.
// If a component throws 500 times in a loop, we don't want 500
// rows in the DB. Cap at 10 per minute, and suppress identical
// errors within a 60-second window.
// ─────────────────────────────────────────────────────────────
const DEDUP_WINDOW_MS = 60 * 1000
const MAX_PER_MINUTE = 10

const recentFingerprints = new Map()  // fingerprint → last seen ts
let errorsThisMinute = 0
let windowStart = Date.now()

function fingerprint(message, stack) {
  return `${message}::${(stack || '').slice(0, 300)}`
}

function shouldSend(message, stack) {
  const now = Date.now()

  // Reset the sliding window
  if (now - windowStart > 60_000) {
    errorsThisMinute = 0
    windowStart = now
  }

  if (errorsThisMinute >= MAX_PER_MINUTE) return false

  const fp = fingerprint(message, stack)
  const last = recentFingerprints.get(fp)
  if (last && now - last < DEDUP_WINDOW_MS) return false

  recentFingerprints.set(fp, now)
  errorsThisMinute += 1

  // Trim the fingerprint map if it ever grows too large
  if (recentFingerprints.size > 200) {
    const cutoff = now - DEDUP_WINDOW_MS * 5
    for (const [key, ts] of recentFingerprints) {
      if (ts < cutoff) recentFingerprints.delete(key)
    }
  }

  return true
}

/**
 * Fire-and-forget error reporter. Never throws.
 *
 * @param {Error|string} error
 * @param {object} [context] — arbitrary metadata (view, action, etc.)
 */
export async function logError(error, context = {}) {
  try {
    if (!error) return

    const message = error?.message || String(error)
    const stack = error?.stack || ''

    if (!shouldSend(message, stack)) return

    let userId = null
    try {
      const { data } = await supabase.auth.getSession()
      userId = data?.session?.user?.id ?? null
    } catch {
      // Ignore — anonymous errors still get logged
    }

    await supabase.from('error_log').insert({
      user_id: userId,
      message,
      stack,
      component_stack: context?.componentStack ?? null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      context: context && Object.keys(context).length > 0 ? context : null,
    })
  } catch {
    // Logger must never throw — a broken logger is worse than no logger.
  }
}