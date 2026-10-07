// src/components/ResetPassword.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  Activity, Lock, CheckCircle, AlertCircle,
  Eye, EyeOff, Loader2, ShieldCheck, Mail
} from 'lucide-react'

const MIN_LENGTH = 8

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const canSubmit = !loading && password.length >= MIN_LENGTH && passwordsMatch
  const succeeded = status.type === 'success'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setStatus({ type: '', message: '' })

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setStatus({
        type: 'success',
        message: 'Password updated. You can now use your new password.'
      })
      setTimeout(() => onDone?.(), 2000)
    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error.message ||
          'Could not update password. The link may have expired.'
      })
    } finally {
      setLoading(false)
    }
  }

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

      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 30%, var(--auth-glow) 0%, transparent 70%)'
        }}
      />

      <div className="relative w-full max-w-[27rem] bg-surface rounded-[32px] border border-line shadow-xl shadow-black/[0.03] dark:shadow-black/40 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
          aria-hidden="true"
        />

        <div className="p-7 md:p-8">

          {/* Brand block */}
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
              Set a new password
            </p>
          </div>

          {/* Success state — replaced form, not appended to it */}
          {succeeded ? (
            <div className="text-center animate-fadeIn">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-success-soft text-success flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-sm text-fg-muted leading-relaxed">
                {status.message}
              </p>
              <p className="text-[11px] text-fg-subtle mt-2">
                Redirecting…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn">

              <div>
                <label
                  htmlFor="reset-password"
                  className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5"
                >
                  New password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-[18px] w-[18px] text-fg-subtle" />
                  </div>
                  <input
                    id="reset-password"
                    name="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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

              <div>
                <label
                  htmlFor="reset-confirm"
                  className="block text-[10px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5"
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <ShieldCheck className="h-[18px] w-[18px] text-fg-subtle" />
                  </div>
                  <input
                    id="reset-confirm"
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

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white font-bold text-sm py-3.5 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-sm active:scale-[0.99] mt-2"
                style={{ minHeight: 48 }}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}

          {/* Error-only escape hatch: expired link, invalid token, etc. */}
          {status.type === 'error' && status.message && (
            <div className="mt-6 animate-fadeIn">
              <div
                role="alert"
                className="p-3.5 rounded-2xl flex items-start gap-2.5 text-[13px] border bg-danger-soft text-danger-text border-danger-border"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{status.message}</p>
              </div>

              <button
                type="button"
                onClick={() => onDone?.()}
                className="mt-4 w-full py-3.5 rounded-2xl text-sm font-bold bg-surface-2 hover:bg-surface-3 text-fg transition-colors flex items-center justify-center gap-2"
                style={{ minHeight: 48 }}
              >
                <Mail className="w-4 h-4" />
                Request a new reset link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}