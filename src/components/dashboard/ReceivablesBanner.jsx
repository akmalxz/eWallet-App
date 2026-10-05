// src/components/dashboard/ReceivablesBanner.jsx
import { HandCoins, ArrowRight } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

export function ReceivablesBanner({ amount, count, onView }) {
  if (!amount || amount <= 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-600 shrink-0">
        <HandCoins className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
          Owed back to you
        </p>
        <p className="text-sm font-bold text-slate-800 mt-0.5">
          {formatMYR(amount)} from {count} pending {count === 1 ? 'split' : 'splits'}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
          Reduces your burn rate until settled.
        </p>
      </div>
      <button
        onClick={onView}
        className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-amber-700 bg-white border border-amber-200 hover:bg-amber-100 transition-colors"
        style={{ minHeight: 44 }}
        aria-label="View pending debts"
      >
        View <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}