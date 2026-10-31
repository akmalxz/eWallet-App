// src/components/commitments/PaidBillRow.jsx
import { Building2, Undo2 } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

export const PaidBillRow = ({ commitment, account, saving, onUndo }) => (
  <div className="flex items-start gap-4 py-4 px-1 border-b border-line/30 last:border-0 opacity-60">
    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-bold text-fg-muted line-through truncate">
          {commitment.name}
        </span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap uppercase tracking-wider bg-success-soft text-success-text">
          Paid
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] font-medium text-fg-muted flex-wrap">
        <Building2 className="w-3 h-3 text-fg-subtle shrink-0" />
        <span>From <strong className="text-fg-muted">{account?.account_name || 'Unknown'}</strong></span>
      </div>
    </div>

    <div className="shrink-0 flex flex-col items-end gap-2.5">
      <span className="text-base font-black text-fg-subtle line-through whitespace-nowrap tabular-figures">
        {formatMYR(commitment.amount)}
      </span>

      <button
        onClick={onUndo}
        disabled={saving}
        className="inline-flex items-center gap-1 text-[11px] font-bold text-fg-subtle hover:text-fg hover:bg-surface-2 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        <Undo2 className="w-3.5 h-3.5" /> Undo
      </button>
    </div>
  </div>
)