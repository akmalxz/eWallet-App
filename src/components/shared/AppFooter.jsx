// src/components/shared/AppFooter.jsx
import { useState } from 'react'
import {
  MessageSquare, Heart, ChevronDown, ChevronRight,
  Send, Check, Loader2, AlertCircle
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { ContactDeveloperModal } from './ContactDeveloperModal'

const MAX_MESSAGE = 2000

export function AppFooter({ user, showToast }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const remaining = MAX_MESSAGE - message.length

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || sending) return

    setSending(true)
    setError(null)
    try {
      const { error: insertErr } = await supabase
        .from('feedback')
        .insert({
          user_id: user?.id ?? null,
          email: user?.email ?? null,
          message: trimmed
        })
      if (insertErr) throw insertErr

      setSent(true)
      setMessage('')
      showToast?.('Thanks for the feedback!', 'success')
      setTimeout(() => setSent(false), 3000)
    } catch (err) {
      setError(err.message)
      showToast?.('Could not send feedback', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <footer className="mt-12 space-y-3">
        {/* FEEDBACK — inline accordion */}
        <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setFeedbackOpen((o) => !o)}
            className="w-full flex items-center justify-between p-4 text-left"
            aria-expanded={feedbackOpen}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-2 text-fg-muted flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-fg">Send feedback</p>
                <p className="text-xs text-fg-muted">Bugs, ideas, anything</p>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-fg-subtle transition-transform ${
                feedbackOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {feedbackOpen && (
            <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3">
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                  placeholder="What's on your mind?"
                  rows={4}
                  disabled={sending || sent}
                  className="w-full bg-surface-2 border border-line rounded-xl py-2.5 px-3 pb-7 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 resize-none transition-all disabled:opacity-60"
                />
                <span
                  className={`absolute bottom-2 right-3 text-[10px] tabular-nums ${
                    remaining < 100 ? 'text-warning-text' : 'text-fg-subtle'
                  }`}
                >
                  {remaining}
                </span>
              </div>

              {error && (
                <p className="flex items-center gap-1.5 text-xs text-danger-text">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{error}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={sending || sent || !message.trim()}
                className="w-full bg-brand-solid hover:bg-brand-solid-hover disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                style={{ minHeight: 44 }}
              >
                {sent ? (
                  <><Check className="w-4 h-4" /> Sent — thank you</>
                ) : sending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                ) : (
                  <><Send className="w-4 h-4" /> Send feedback</>
                )}
              </button>
            </form>
          )}
        </div>

        {/* SUPPORT — opens modal */}
        <button
          type="button"
          onClick={() => setContactOpen(true)}
          className="w-full bg-surface/60 backdrop-blur-xl border border-line/50 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-surface/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-2 text-fg-muted flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-fg">Support the developer</p>
              <p className="text-xs text-fg-muted">Say hi, or help keep it running</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-fg-subtle" />
        </button>
      </footer>

      {contactOpen && (
        <ContactDeveloperModal onClose={() => setContactOpen(false)} />
      )}
    </>
  )
}