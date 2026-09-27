// src/components/modals/AutomationModal.jsx
import { Copy, Zap } from 'lucide-react'
import { ModalWrapper } from './ModalWrapper'

export const AutomationModal = ({
  user,
  closeModal,
  showToast
}) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(user.id)
    showToast('User ID copied to clipboard!', 'success')
  }

  return (
    <ModalWrapper title="Automation & Shortcuts" closeModal={closeModal}>
      <div className="space-y-5">
        <p className="text-sm text-slate-500 leading-relaxed">
          Use your FlowState User ID to authenticate your iOS Shortcuts.{' '}
          <strong className="text-slate-700">Keep this ID secure.</strong>
        </p>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Your User ID
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={user?.id || ''}
              aria-label="User ID"
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-700 outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2.5 rounded-lg transition-colors border border-blue-100"
              title="Copy User ID"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 flex gap-2.5">
          <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            Paste this ID into the Import Question when installing the Apple Shortcut.
            All OCR receipts will automatically route to your personal vault.
          </p>
        </div>
      </div>
    </ModalWrapper>
  )
}