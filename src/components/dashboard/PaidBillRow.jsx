// src/components/dashboard/PaidBillRow.jsx
import { CheckCircle, Building2, Undo2 } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

export const PaidBillRow = ({ commitment, account, saving, onUndo }) => (
  <div className="rounded-xl transition-all border shadow-sm p-4 bg-success-soft/30 border-success-border">
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-success-soft text-success">
          <CheckCircle className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-fg-muted line-through truncate">
              {commitment.name}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap uppercase tracking-wider bg-success-soft text-success-text border border-success-border">
              Paid
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-medium text-fg-muted flex-wrap">
            <Building2 className="w-3 h-3 text-fg-subtle shrink-0" />
            <span>
              From{' '}
              <strong className="text-fg-muted">{account?.account_name || 'Unknown'}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-line pt-3 sm:pt-0">
        <span className="text-base font-black text-fg-subtle line-through whitespace-nowrap">
          {formatMYR(commitment.amount)}
        </span>

        <button
          onClick={onUndo}
          disabled={saving}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-fg-subtle hover:text-fg hover:bg-surface px-2.5 py-2 rounded-md transition-colors border border-transparent hover:border-line disabled:opacity-50"
          style={{ minHeight: 44 }}
          aria-label={`Undo payment for ${commitment.name}`}
        >
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </button>
      </div>
    </div>
  </div>
)