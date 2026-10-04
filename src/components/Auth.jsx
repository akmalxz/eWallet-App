// src/components/Auth.jsx
import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  Activity, Mail, Lock, CheckCircle, AlertCircle,
  Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck
} from 'lucide-react'

// ============================================================
// PASSWORD STRENGTH — NIST SP 800-63B-aligned
// Length is the primary signal. Composition rules (uppercase
// + number + symbol) are intentionally absent — NIST Rev. 4
// explicitly forbids mandating them. Blocklist catches the
// most common passwords.
// ============================================================
const MIN_LENGTH = 8
const BLOCKLIST = new Set([
  'password', '12345678', 'qwerty123', 'letmein', 'iloveyou',
  'admin123', 'welcome1', 'password1', 'abc12345', 'qwertyui',
  'monkey123', 'dragon123', 'football', 'baseball', 'sunshine'
])

function scorePassword(pw) {
  if (!pw) return { score: 0, label: '', checks: [] }

  const checks = [
    { id: 'length',   label: `At least ${MIN_LENGTH} characters`, ok: pw.length >= MIN_LENGTH },
    { id: 'longer',   label: '12+ characters is stronger',        ok: pw.length >= 12 },
    { id: 'variety',  label: 'Mix letters, numbers, symbols',     ok: /[a-zA-Z]/.test(pw) && /\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw) },
    { id: 'nosimple', label: 'Not a commonly used password',      ok: !BLOCKLIST.has(pw.toLowerCase()) }
  ]

  // Score: length is 60% of the weight, variety 25%, blocklist 15%
  let score = 0
  if (pw.length >= MIN_LENGTH) score += 1
  if (pw.length >= 12) score += 1
  if (pw.length >= 16) score += 1
  if (checks[2].ok) score += 1
  if (checks[3].ok) score += 1

  // Cap at 4; label from score
  const capped = Math.min(score, 4)
  const labels = ['Too short', 'Weak', 'Fair', 'Strong', 'Very strong']
  const colors = ['text-danger', 'text-danger', 'text-warning', 'text-success', 'text-success']
  const bars = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-success', 'bg-success']

  return {
    score: capped,
    label: labels[capped],
    color: colors[capped],
    barColor: bars[capped],
    checks
  }
}

// ============================================================
// AUTH COMPONENT
// ============================================================
export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [showPassword, setShowPassword] = useState(false)

  const strength = useMemo(() => scorePassword(password), [password])

  const passwordsMatch = !isSignUp || (confirmPassword.length > 0 && password === confirmPassword)
  const canSubmit = (() => {
    if (loading) return false
    if (!email || !password) return false
    if (isForgot) return true
    if (isSignUp) {
      return strength.score >= 2 && passwordsMatch && strength.checks[0].ok && strength.checks[3].ok
    }
    return true
  })()

  const resetForm = () => {
    setStatus({ type: '', message: '' })
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
  }

  // ----------------------------------------------------------
  // SIGN IN / SIGN UP
  // ----------------------------------------------------------
  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus({ type: '', message: '' })

    try {
      if (isSignUp) {
        if (!passwordsMatch) throw new Error('Passwords do not match')
        if (strength.score < 2) throw new Error('Please choose a stronger password')
        if (!strength.checks[3].ok) throw new Error('That password is too common. Pick another.')
        if (password.length < MIN_LENGTH) throw new Error(`Password must be at least ${MIN_LENGTH} characters`)

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}`
          }
        })
        if (error) throw error

        // Honest message based on whether a session was returned
        const needsConfirmation = !data.session
        setStatus({
          type: 'success',
          message: needsConfirmation
            ? 'Account created. Check your inbox to confirm your email, then log in.'
            : 'Account created! You\'re now logged in.'
        })
        resetForm()
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Auth state listener in useAuth will flip the app to the dashboard
      }
    } catch (error) {
      setStatus({ type: 'error', message: friendlyError(error) })
    } finally {
      setLoading(false)
    }
  }

  // ----------------------------------------------------------
  // FORGOT PASSWORD
  // ----------------------------------------------------------
  const handleForgot = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus({ type: '', message: '' })

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error

      setStatus({
        type: 'success',
        message: 'Reset link sent. Check your inbox.'
      })
    } catch (error) {
      setStatus({ type: 'error', message: friendlyError(error) })
    } finally {
      setLoading(false)
    }
  }

  // ----------------------------------------------------------
  // Friendly error mapping
  // ----------------------------------------------------------
  const friendlyError = (error) => {
    const msg = error.message || 'Something went wrong.'
    const lower = msg.toLowerCase()

    if (lower.includes('invalid login credentials')) return 'Email or password is incorrect.'
    if (lower.includes('email not confirmed'))       return 'Please confirm your email first. Check your inbox.'
    if (lower.includes('user already registered'))   return 'That email is already registered. Try logging in.'
    if (lower.includes('rate limit'))                return 'Too many attempts. Please wait a moment.'
    if (lower.includes('network'))                   return 'Network error. Check your connection.'

    return msg
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  return (
    <div className="min-h-dvh bg-page flex flex-col justify-center items-center px-safe py-safe">
      <div
        className="w-full bg-surface rounded-3xl shadow-sm border border-line p-6 md:p-8"
        style={{
          maxWidth: '28rem',
          marginLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
          marginRight: 'max(1rem, env(safe-area-inset-right, 0px))'
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-fg p-3 rounded-2xl mb-4 shadow-md">
            <Activity className="text-fg-inverse w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-fg tracking-tight">
            {isForgot ? 'Reset Password' : 'FlowState Finance'}
          </h1>
          <p className="text-sm text-fg-subtle mt-2 text-center">
            {isForgot
              ? 'Enter your email and we\'ll send you a reset link.'
              : isSignUp
                ? 'Create a secure vault to begin.'
                : 'Enter your credentials to access your vault.'}
          </p>
        </div>

        {/* Forgot back button */}
        {isForgot && (
          <button
            type="button"
            onClick={() => {
              setIsForgot(false)
              resetForm()
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-fg-muted hover:text-fg transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to login
          </button>
        )}

        {/* Form */}
        <form onSubmit={isForgot ? handleForgot : handleAuth} className="space-y-4">

          {/* EMAIL */}
          <div>
            <label
              htmlFor="auth-email"
              className="block text-sm font-medium text-fg-muted mb-1"
            >
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-fg-subtle" />
              </div>
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-surface-2 border border-line rounded-xl py-3 pl-10 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:ring-2 focus:ring-brand/40 focus:border-brand outline-none transition-all disabled:opacity-60"
                disabled={loading}
              />
            </div>
          </div>

          {/* PASSWORD — hidden on forgot-password view */}
          {!isForgot && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="auth-password"
                  className="block text-sm font-medium text-fg-muted"
                >
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgot(true)
                      resetForm()
                    }}
                    className="text-xs font-medium text-brand hover:text-brand-hover transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-fg-subtle" />
                </div>
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={MIN_LENGTH}
                  className="w-full bg-surface-2 border border-line rounded-xl py-3 pl-10 pr-12 text-sm text-fg placeholder:text-fg-subtle focus:ring-2 focus:ring-brand/40 focus:border-brand outline-none transition-all disabled:opacity-60"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-muted transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* STRENGTH METER — signup only */}
          {isSignUp && password.length > 0 && (
            <div className="space-y-2">
              {/* Bar */}
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < strength.score ? strength.barColor : 'bg-surface-3'
                    }`}
                  />
                ))}
              </div>

              {/* Label */}
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${strength.color}`}>{strength.label}</span>
              </div>

              {/* Checklist */}
              <ul className="space-y-1 pt-1">
                {strength.checks.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-[11px]">
                    {c.ok
                      ? <CheckCircle className="w-3 h-3 text-success shrink-0" />
                      : <div className="w-3 h-3 rounded-full border border-line-strong shrink-0" />}
                    <span className={c.ok ? 'text-fg-muted' : 'text-fg-subtle'}>
                      {c.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CONFIRM PASSWORD — signup only */}
          {isSignUp && (
            <div>
              <label
                htmlFor="auth-confirm"
                className="block text-sm font-medium text-fg-muted mb-1"
              >
                Confirm password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-fg-subtle" />
                </div>
                <input
                  id="auth-confirm"
                  name="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={MIN_LENGTH}
                  className={`w-full bg-surface-2 border rounded-xl py-3 pl-10 pr-4 text-sm text-fg placeholder:text-fg-subtle outline-none transition-all disabled:opacity-60 focus:ring-2 ${
                    confirmPassword && !passwordsMatch
                      ? 'border-danger-border focus:ring-danger/40 focus:border-danger'
                      : 'border-line focus:ring-brand/40 focus:border-brand'
                  }`}
                  disabled={loading}
                />
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-[11px] text-danger mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Passwords don't match
                </p>
              )}
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading
              ? 'Please wait…'
              : isForgot
                ? 'Send reset link'
                : isSignUp
                  ? 'Create Account'
                  : 'Log In'}
          </button>
        </form>

        {/* Toggle sign-in / sign-up — hidden on forgot */}
        {!isForgot && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                resetForm()
              }}
              className="text-sm text-fg-muted hover:text-fg transition-colors"
              type="button"
            >
              {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
            </button>
          </div>
        )}

        {/* STATUS */}
        {status.message && (
          <div
            role="alert"
            className={`mt-6 p-4 rounded-xl flex items-start gap-3 text-sm border ${
              status.type === 'success'
                ? 'bg-success-soft text-success-text border-success-border'
                : 'bg-danger-soft text-danger-text border-danger-border'
            }`}
          >
            {status.type === 'success'
              ? <CheckCircle className="w-5 h-5 shrink-0" />
              : <AlertCircle className="w-5 h-5 shrink-0" />}
            <p>{status.message}</p>
          </div>
        )}
      </div>
    </div>
  )
}