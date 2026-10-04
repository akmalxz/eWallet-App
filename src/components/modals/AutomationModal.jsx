// src/components/modals/AutomationModal.jsx
import { Copy, Zap, Download } from 'lucide-react'
import { ModalWrapper } from './ModalWrapper'

export const AutomationModal = ({ user, closeModal, showToast }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(user.id)
    showToast('User ID copied to clipboard!', 'success')
  }

  return (
    <ModalWrapper title="Automation & Shortcuts" closeModal={closeModal}>
      <div className="space-y-5">

        <div className="bg-info-soft p-4 rounded-xl border border-info-border">
          <h3 className="text-xs font-bold text-info-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Setup Instructions
          </h3>
          <ol className="text-sm text-info-text space-y-2 ml-1 list-decimal list-inside">
            <li>Copy your User ID from the box below.</li>
            <li>Tap the <strong>Install Shortcut</strong> button.</li>
            <li>Paste your User ID into the setup prompt on your iPhone.</li>
          </ol>
        </div>

        <div className="bg-surface-2 p-4 rounded-xl border border-line space-y-3">
          <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
            Your User ID
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={user?.id || ''}
              aria-label="User ID"
              className="flex-1 bg-surface border border-line rounded-lg px-3 py-2.5 text-sm font-mono text-fg-muted outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="bg-surface-3 text-fg hover:bg-line-strong p-2.5 rounded-lg transition-colors border border-line"
              title="Copy User ID"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <a
          href="https://www.icloud.com/shortcuts/02d7884a5d5a4f7c8ee7c276467b875f"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-brand-solid hover:bg-brand-solid-hover text-white font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-md outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-surface"
        >
          <Download className="w-4 h-4" />
          Install iOS Shortcut
        </a>

      </div>
    </ModalWrapper>
  )
}