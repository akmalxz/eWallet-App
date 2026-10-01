// src/components/shared/ConfirmSheet.jsx
import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Sheet } from './Sheet'

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

  useEffect(() => {
    const t = setTimeout(() => cancelRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <Sheet onClose={onCancel} saving={saving} maxWidth="md:max-w-sm">
      <div className="flex items-start gap-3">
        {destructive && (
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {message && (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving}
          className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 ${
            destructive ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-900 hover:bg-slate-800'
          }`}
          style={{ minHeight: 44 }}
        >
          {saving ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}