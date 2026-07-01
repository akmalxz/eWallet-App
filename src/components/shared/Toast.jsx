// src/components/shared/Toast.jsx
import { useEffect } from 'react'
import { Check, AlertTriangle, AlertCircle, Activity, X } from 'lucide-react'

export const ToastNotification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  }

  const icons = {
    success: <Check className="w-5 h-5" />,
    error: <AlertTriangle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Activity className="w-5 h-5" />
  }

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl border shadow-lg flex items-center gap-3 max-w-md animate-slide-in ${styles[type] || styles.info}`}>
      {icons[type] || icons.info}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-auto hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}