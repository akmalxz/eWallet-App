// src/components/dashboard/BurnRateHelpSheet.jsx
import { useEffect } from 'react'
import { X, Info } from 'lucide-react'

export const BurnRateHelpSheet = ({ onClose }) => {
  // Escape closes
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end md:items-center justify-center bg-slate-900/20 p-0 md:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="burn-rate-help-title"
    >
      <div
        className="w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3
                id="burn-rate-help-title"
                className="text-base font-bold text-slate-800 truncate"
              >
                How the Burn Rate works
              </h3>
              <p className="text-[11px] text-slate-400">Quick reference</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close help"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5 text-sm text-slate-600 leading-relaxed overflow-y-auto">
          <div className="flex gap-3">
            <div className="w-1 rounded-full bg-blue-200 shrink-0" />
            <div>
              <p className="font-bold text-slate-800 mb-1">Everyday spending only</p>
              <p className="text-xs">
                Only your normal day-to-day purchases count toward the daily average.
                Bills and subscriptions are kept separate, because they're paid once
                a month, not daily.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-1 rounded-full bg-blue-200 shrink-0" />
            <div>
              <p className="font-bold text-slate-800 mb-1">Bills are subtracted first</p>
              <p className="text-xs">
                We look at the balance, subtract every bill that's still unpaid
                before your next payday, and the remainder is your "free money" for
                everyday spending.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-1 rounded-full bg-blue-200 shrink-0" />
            <div>
              <p className="font-bold text-slate-800 mb-1">Runway is counted to payday</p>
              <p className="text-xs">
                Your runway is how many days your free money lasts at your current
                daily pace. If it lasts past payday, you're on track. If it runs out
                earlier, you'll see an alert.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-1 rounded-full bg-blue-200 shrink-0" />
            <div>
              <p className="font-bold text-slate-800 mb-1">Payday</p>
              <p className="text-xs">
                Your payday is the last working day of the month. Weekends are
                skipped.
              </p>
            </div>
          </div>
        </div>

        <div
          className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors"
            style={{ minHeight: 44 }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}