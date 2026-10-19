// src/components/shared/ConfirmSheet.jsx
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

export const ConfirmSheet = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  saving = false,
  onConfirm,
  onCancel
}) => {
  const cancelRef = useRef(null)

  // Freeze the page behind the modal
  useBodyScrollLock(true)

  useEffect(() => {
    const t = setTimeout(() => cancelRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [])

  // Escape key to cancel
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) {
        e.preventDefault()
        onCancel?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, saving])

  const content = (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={() => !saving && onCancel?.()}
      style={{ touchAction: 'none' }}
    >
      <div
        className="relative w-full max-w-sm bg-surface border border-line-strong rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3">
          {destructive && (
            <div className="w-10 h-10 rounded-full bg-danger-soft flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
          )}
          <div className="min-w-0 pt-0.5">
            <h3 className="text-base font-bold text-fg">{title}</h3>
            {message && (
              <p className="text-sm text-fg-muted mt-1.5 leading-relaxed">{message}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-fg-muted bg-surface-2 border border-line hover:bg-surface-3 transition-colors disabled:opacity-50"
            style={{ minHeight: 44 }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 ${
              destructive
                ? 'bg-danger-solid hover:bg-danger-solid-hover'
                : 'bg-brand-solid hover:bg-brand-solid-hover'
            }`}
            style={{ minHeight: 44 }}
          >
            {saving ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}