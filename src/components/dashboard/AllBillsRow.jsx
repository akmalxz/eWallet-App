// src/components/dashboard/AllBillsRow.jsx
import { Calendar, Power } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { RowMenu } from '../shared/RowMenu'

export const AllBillsRow = ({ commitment, paidCount, menuActions }) => {
  const isBnpl = commitment.kind === 'bnpl'
  const isPaused = !commitment.is_active
  const bnplTerm = isBnpl ? (commitment.term_months ?? 0) : 0
  const bnplComplete = isBnpl && bnplTerm > 0 && paidCount >= bnplTerm

  return (
    <div className={`flex items-center gap-3 px-3.5 py-2.5 ${isPaused ? 'opacity-70' : ''}`}>
      <div
        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
          isPaused ? 'bg-surface-2 text-fg-subtle' : 'bg-surface-2 text-fg-muted'
        }`}
      >
        {isPaused
          ? <Power className="w-3.5 h-3.5" />
          : <Calendar className="w-3.5 h-3.5" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`text-sm font-bold truncate ${
              isPaused ? 'text-fg-muted' : 'text-fg'
            }`}
          >
            {commitment.name}
          </span>
          {isBnpl && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-purple-soft text-purple border border-purple/30 shrink-0">
              BNPL
            </span>
          )}
          {isPaused && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-surface-2 text-fg-subtle border border-line shrink-0">
              Paused
            </span>
          )}
        </div>

        <p className="text-[11px] text-fg-subtle mt-0.5 truncate">
          {isBnpl
            ? bnplComplete
              ? `Complete · ${bnplTerm} of ${bnplTerm} paid`
              : `Due ${commitment.due_day_of_month}th · ${paidCount} of ${bnplTerm} paid`
            : `Due ${commitment.due_day_of_month}th`}
        </p>
      </div>

      <span
        className={`text-sm font-black whitespace-nowrap shrink-0 ${
          isPaused ? 'text-fg-subtle' : 'text-fg'
        }`}
      >
        {formatMYR(commitment.amount)}
      </span>

      <RowMenu actions={menuActions} ariaLabel={`${commitment.name} actions`} />
    </div>
  )
}