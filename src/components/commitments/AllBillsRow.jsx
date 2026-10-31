// src/components/commitments/AllBillsRow.jsx
import { formatMYR } from '../../utils/formatters'
import { RowMenu } from '../shared/RowMenu'

export const AllBillsRow = ({ commitment, paidCount, menuActions }) => {
  const isBnpl = commitment.kind === 'bnpl'
  const isPaused = !commitment.is_active
  const bnplTerm = isBnpl ? (commitment.term_months ?? 0) : 0
  const bnplComplete = isBnpl && bnplTerm > 0 && paidCount >= bnplTerm

  return (
    <div className={`flex items-center gap-4 py-3.5 px-1 border-b border-line/30 last:border-0 ${isPaused ? 'opacity-50' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-bold truncate ${isPaused ? 'text-fg-muted' : 'text-fg'}`}>
            {commitment.name}
          </span>
          {isBnpl && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-purple-soft text-purple shrink-0">
              BNPL
            </span>
          )}
          {isPaused && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-surface-2 text-fg-subtle shrink-0">
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

      <span className={`text-sm font-black whitespace-nowrap shrink-0 tabular-figures ${isPaused ? 'text-fg-subtle' : 'text-fg'}`}>
        {formatMYR(commitment.amount)}
      </span>

      <RowMenu actions={menuActions} ariaLabel={`${commitment.name} actions`} />
    </div>
  )
}