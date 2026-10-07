// src/components/Auth.jsx
import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  Activity, Mail, Lock, CheckCircle, AlertCircle,
  Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft
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

  let score = 0
  if (pw.length >= MIN_LENGTH) score += 1
  if (pw.length >= 12) score += 1
  if (pw.length >= 16) score += 1
  if (checks[2].ok) score += 1
  if (checks[3].ok) score += 1

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
// FRIENDLY ERROR MAPPING
// ============================================================
function friendlyError(error) {
  const msg = error?.message || 'Something went wrong.'
  const lower = msg.toLowerCase()

  if (lower.includes('invalid login credentials')) return 'Email or password is incorrect.'
  if (lower.includes('email not confirmed'))       return 'Please confirm your email first. Check your inbox.'
  if (lower.includes('user already registered'))   return 'That email is already registered. Try logging in.'
  if (lower.includes('rate limit'))                return 'Too many attempts. Please wait a moment.'
  if (lower.includes('network'))                   return 'Network error. Check your connection.'

  return msg
}

// ============================================================
// SUBCOMPONENTS
// ============================================================

function BrandBlock({ mode }) {
  const subtitle =
    mode === 'forgot'  ? 'Reset your password'
  : mode === 'sign-up' ? 'Create your account'
  :                      'Welcome back'

  return (
    <div className="flex flex-col items-center mb-8">
      <div className="relative mb-5">
        <div
          className="absolute inset-0 bg-fg blur-2xl opacity-15 rounded-3xl"
          aria-hidden="true"
        />
        <div className="relative bg-fg p-3.5 rounded-2xl shadow-lg">
          <Activity className="text-fg-inverse w-7 h-7" strokeWidth={2.5} />
        </div>
      </div>

      <h1 className="text-[26px] font-bold tracking-[-0.03em] text-fg leading-none">
        FlowState Finance
      </h1>
      <p className="text-[13px] text-fg-subtle mt-2">
        {subtitle}
      </p>
    </div>
  )
}

function StatusMessage({ status }) {
  if (!status.message) return null

  const isSuccess = status.type === 'success'
  return (
    <div
      role="alert"
      className={`mt-6 p-3.5 rounded-2xl flex items-start gap-2.5 text-[13px] border animate-fadeIn ${
        isSuccess
          ? 'bg-success-soft text-success-text border-success-border'
          : 'bg-danger-soft text-danger-text border-danger-border'
      }`}
    >
      {isSuccess
        ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
        : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
      <p className="leading-relaxed">{status.message}</p>
    </div>
  )
}

// ============================================================
// AUTH COMPONENT
// ============================================================
export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mode, setMode] = useState('sign-in') // 'sign-in' | 'sign-up' | 'forgot'
  const [status, setStatus] = useState({ type: '', message: '' })
  const [showPassword, setShowPassword] = useState(false)

  const isSignUp = mode === 'sign-up'
  const isForgot = mode === 'forgot'
  const forgotSuccess = isForgot && status.type === 'success'

  const strength = useMemo(() => scorePassword(password), [password])

  const passwordsMatch =
    !isSignUp || (confirmPassword.length > 0 && password === confirmPassword)

  const canSubmit = (() => {
    if (loading) return false
    if (isForgot) return !!email
    if (!email || !password) return false
    if (isSignUp) {
      return (
        strength.score >= 2 &&
        passwordsMatch &&
        strength.checks[0].ok &&
        strength.checks[3].ok
      )
    }
    return true
  })()

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setStatus({ type: '', message: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus({ type: '', message: '' })

    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`
        })
        if (error) throw error
        setStatus({
          type: 'success',
          message: 'If an account exists for that email, a reset link is on its way. It may take a minute to arrive.'
        })
      } else if (isSignUp) {
        if (!passwordsMatch) throw new Error('Passwords do not match')
        if (strength.score < 2) throw new Error('Please choose a stronger password')
        if (!strength.checks[3].ok) throw new Error('That password is too common. Pick another.')
        if (password.length < MIN_LENGTH) throw new Error(`Password must be at least ${MIN_LENGTH} characters`)

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}` }
        })
        if (error) throw error

        const needsConfirmation = !data.session
        setStatus({
          type: 'success',
          message: needsConfirmation
            ? 'Account created. Check your inbox to confirm your email, then log in.'
            : "Account created. You're now logged in."
        })
        setPassword('')
        setConfirmPassword('')
        setShowPassword(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      setStatus({ type: 'error', message: friendlyError(error) })
    } finally {
      setLoading(false)
    }
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  return (
    <div
      className="min-h-dvh bg-page relative flex flex-col justify-center items-center overflow-hidden"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))'
      }}
    >

      {/* Ambient brand glow behind the card */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 30%, var(--auth-glow) 0%, transparent 70%)'
        }}
      />

      <div className="relative w-full max-w-[27rem] bg-surface rounded-[32px] border border-line shadow-xl shadow-black/[0.03] dark:shadow-black/40 overflow-hidden">
        {/* Top sheen — the iOS-card highlight */}
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
          aria-hidden="true"
        />

        <div className="p-7 md:p-8">

          <BrandBlock mode={mode} />

          {/* ---------- Forgot: success state ---------- */}
          {forgotSuccess ? (
            <div className="text-center animate-fadeIn">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-success-soft text-success flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>
              <p className="text-sm text-fg-muted leading-relaxed mb-6">
                We've sent a reset link to{' '}
                <strong className="text-fg">{email}</strong>.
              </p>
              <button
                type="button"
                onClick={() => switchMode('sign-in')}
                className="w-full py-3.5 rounded-2xl text-sm font-bold bg-surface-2 hover:bg-surface-3 text-fg transition-colors"
                style={{ minHeight: 48 }}
              >
                Back to login
              </button>
            </div>
          ) : (
            <>
              {/* ---------- Forgot: back link ---------- */}
              {isForgot && (
                <button
                  type="button"
                  onClick={() => switchMode('sign-in')}
                  className="flex items-center gap-1.5 text-[12px] font-bold text-fg-muted hover:text-fg transition-colors mb-5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to login
                </button>
              )}

              {/* ---------- Form ---------- */}
              <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn">

                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-[18px] w-[18px] text-fg-subtle" />
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
                      disabled={loading}
                      className="w-full bg-surface-2 border border-line rounded-2xl py-3.5 pl-11 pr-4 text-sm text-fg placeholder:text-fg-subtle outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:opacity-60"
                      style={{ minHeight: 48 }}
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                {!isForgot && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="auth-password"
                        className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider"
                      >
                        Password
                      </label>
                      {!isSignUp && (
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-[11px] font-bold text-brand hover:text-brand-hover transition-colors"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-[18px] w-[18px] text-fg-subtle" />
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
                        disabled={loading}
                        className="w-full bg-surface-2 border border-line rounded-2xl py-3.5 pl-11 pr-12 text-sm text-fg placeholder:text-fg-subtle outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:opacity-60"
                        style={{ minHeight: 48 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-fg-subtle hover:text-fg-muted transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* STRENGTH METER — signup only */}
                {isSignUp && password.length > 0 && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i < strength.score ? strength.barColor : 'bg-surface-3'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-bold ${strength.color}`}>{strength.label}</span>
                    </div>

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
                  <div className="animate-fadeIn">
                    <label
                      htmlFor="auth-confirm"
                      className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5"
                    >
                      Confirm password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <ShieldCheck className="h-[18px] w-[18px] text-fg-subtle" />
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
                        disabled={loading}
                        className={`w-full bg-surface-2 border rounded-2xl py-3.5 pl-11 pr-4 text-sm text-fg placeholder:text-fg-subtle outline-none transition-all focus:ring-4 disabled:opacity-60 ${
                          confirmPassword && !passwordsMatch
                            ? 'border-danger-border focus:border-danger focus:ring-danger/15'
                            : 'border-line focus:border-brand focus:ring-brand/15'
                        }`}
                        style={{ minHeight: 48 }}
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
                  className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white font-bold text-sm py-3.5 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-sm active:scale-[0.99] mt-2"
                  style={{ minHeight: 48 }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading
                    ? 'Please wait…'
                    : isForgot
                      ? 'Send reset link'
                      : isSignUp
                        ? 'Create account'
                        : 'Log in'}
                </button>
              </form>

              {/* ---------- Mode toggle ---------- */}
              {!isForgot && (
                <p className="text-[13px] text-fg-subtle text-center mt-6">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => switchMode(isSignUp ? 'sign-in' : 'sign-up')}
                    className="font-bold text-brand hover:text-brand-hover transition-colors"
                  >
                    {isSignUp ? 'Log in' : 'Sign up'}
                  </button>
                </p>
              )}
            </>
          )}

          <StatusMessage status={status} />
        </div>
      </div>
    </div>
  )
}