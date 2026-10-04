// src/components/shared/ContactDeveloperModal.jsx
import { X, Mail, MessageCircle, Globe } from 'lucide-react'
import {
  SiGithub,
  SiInstagram,
  SiThreads
} from "react-icons/si";

// EDIT THESE — replace with your real handles.
const CHANNELS = [
  {
    id: 'email',
    label: 'Email',
    handle: 'muhammadakmal2490@gmail.com',
    href: 'mailto:muhammadakmal2490@gmail.com',
    Icon: Mail
  },
  {
    id: 'github',
    label: 'GitHub',
    handle: '@akmalxz',
    href: 'https://github.com/akmalxz',
    Icon: SiGithub
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@__akmalxz',
    href: 'https://instagram.com/__akmalxz',
    Icon: SiInstagram
  },
  {
    id: 'threads',
    label: 'Threads',
    handle: '@akmalxz',
    href: 'https://threads.com/__akmalxz',
    Icon: SiThreads
  }
]

export function ContactDeveloperModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-line rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-5 pb-safe-4 md:pb-5 shadow-xl animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Contact the developer"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-fg">Support the developer</h2>
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              Built on my own time. If it's useful, reach out.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-fg-muted hover:bg-surface-2 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {CHANNELS.map(({ id, label, handle, href, Icon }) => {
            const isMailto = href.startsWith('mailto:')
            return (
              <a
                key={id}
                href={href}
                target={isMailto ? undefined : '_blank'}
                rel={isMailto ? undefined : 'noopener noreferrer'}
                className="flex items-center gap-3 p-3 bg-surface-2/60 hover:bg-surface-2 border border-line rounded-xl transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-surface text-fg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-fg">{label}</p>
                  <p className="text-xs text-fg-muted truncate">{handle}</p>
                </div>
              </a>
            )
          })}
        </div>

        <p className="text-[11px] text-fg-subtle text-center mt-4 leading-relaxed">
          No donation link yet — a message or a share is plenty for now.
        </p>
      </div>
    </div>
  )
}