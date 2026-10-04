// src/components/Auth.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Activity, Mail, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [showPassword, setShowPassword] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus({ type: '', message: '' })

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setStatus({ type: 'success', message: 'Account created successfully! You are now logged in.' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Authentication failed.' })
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
          <h1 className="text-2xl font-bold text-fg tracking-tight">FlowState Finance</h1>
          <p className="text-sm text-fg-subtle mt-2 text-center">
            {isSignUp ? 'Create a secure vault to begin.' : 'Enter your credentials to access your vault.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-muted mb-1">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-fg-subtle" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-surface-2 border border-line rounded-xl py-3 pl-10 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:ring-2 focus:ring-brand/40 focus:border-brand outline-none transition-all disabled:opacity-60"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-muted mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-fg-subtle" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full bg-surface-2 border border-line rounded-xl py-3 pl-10 pr-12 text-sm text-fg placeholder:text-fg-subtle focus:ring-2 focus:ring-brand/40 focus:border-brand outline-none transition-all disabled:opacity-60"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-muted transition-colors"
                tabIndex="-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center mt-2"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Log In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setStatus({ type: '', message: '' })
            }}
            className="text-sm text-fg-muted hover:text-fg transition-colors"
            type="button"
          >
            {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>

        {status.message && (
          <div
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