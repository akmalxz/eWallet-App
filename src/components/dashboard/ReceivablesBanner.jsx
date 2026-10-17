// src/components/dashboard/ReceivablesBanner.jsx
import { HandCoins, ArrowRight } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

export function ReceivablesBanner({ amount, count, onView }) {
  if (!amount || amount <= 0) return null

  return (
    <div className="bg-warning-soft border border-warning-border rounded-xl p-4 flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-warning shrink-0">
        <HandCoins className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-warning-text uppercase tracking-wider">
          Owed back to you
        </p>
        <p className="text-sm font-bold text-fg mt-0.5 tabular-figures">
          {formatMYR(amount)} from {count} pending {count === 1 ? 'split' : 'splits'}
        </p>
        <p className="text-[11px] text-fg-muted mt-0.5 leading-relaxed">
          Reduces your burn rate until settled.
        </p>
      </div>
      <button
        onClick={onView}
        className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-warning-text bg-surface border border-warning-border hover:bg-warning-soft transition-colors"
        style={{ minHeight: 44 }}
        aria-label="View pending debts"
      >
        View <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}