// src/components/ResetPassword.jsx
import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  Activity, Lock, CheckCircle, AlertCircle,
  Eye, EyeOff, Loader2, ShieldCheck
} from 'lucide-react'

const MIN_LENGTH = 8

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const canSubmit =
    !loading &&
    password.length >= MIN_LENGTH &&
    passwordsMatch

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
        message: error.message || 'Could not update password. The link may have expired.'
      })
    } finally {
      setLoading(false)
    }
  }

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
        <div className="flex flex-col items-center mb-8">
          <div className="bg-fg p-3 rounded-2xl mb-4 shadow-md">
            <Activity className="text-fg-inverse w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-fg tracking-tight">Set New Password</h1>
          <p className="text-sm text-fg-subtle mt-2 text-center">
            Choose a new password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-password" className="block text-sm font-medium text-fg-muted mb-1">
              New password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-fg-subtle" />
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

          <div>
            <label htmlFor="reset-confirm" className="block text-sm font-medium text-fg-muted mb-1">
              Confirm new password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ShieldCheck className="h-5 w-5 text-fg-subtle" />
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

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>

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