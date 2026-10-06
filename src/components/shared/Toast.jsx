// src/components/shared/Toast.jsx
import { useEffect } from 'react'
import { Check, AlertTriangle, AlertCircle, Activity, X } from 'lucide-react'

export const ToastNotification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  // Theme-aware semantic styles. Research confirms toasts should follow
  // the active theme, not use inverted surfaces.
  const styles = {
    success: 'bg-success-soft border-success-border text-success-text',
    error:   'bg-danger-soft border-danger-border text-danger-text',
    warning: 'bg-warning-soft border-warning-border text-warning-text',
    info:    'bg-info-soft border-info-border text-info-text'
  }

  const icons = {
    success: <Check className="w-5 h-5" />,
    error: <AlertTriangle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Activity className="w-5 h-5" />
  }

  // Positioned by the parent container in App.jsx, which respects
  // safe-area insets. This element intentionally has no positioning
  // of its own — adding `fixed`/`absolute` here would override the
  // container's placement and break on notched devices.
  return (
    <div
      className={`p-4 rounded-xl border shadow-lg flex items-center gap-3 max-w-md animate-slide-in ${
        styles[type] || styles.info
      }`}
    >
      {icons[type] || icons.info}
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-auto hover:opacity-70"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}