// src/components/commitments/BillRow.jsx
import { Building2, Wallet, Check } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { getPeriodPill } from '../../utils/commitments/commitmentPill'
import { toMYDate } from '../../utils/dateHelpers'
import { RowMenu } from '../shared/RowMenu'

export const BillRow = ({
  period,
  account,
  paidCount,
  saving,
  onMarkPaid,
  menuActions
}) => {
  const comm = period.commitment
  const accountBalance = account?.balance ?? 0
  const nowMY = toMYDate(new Date())
  const pill = getPeriodPill(period, nowMY)
  const accountShort = period.accountShort
  const isBnpl = comm.kind === 'bnpl' && comm.term_months != null
  const bnplRemainingAmount = isBnpl ? Math.max(0, (Number(comm.amount) || 0) * (comm.term_months - paidCount)) : 0

  return (
    <div className="flex items-start gap-4 py-4 px-1 border-b border-line/30 last:border-0 hover:bg-surface-2/30 transition-all">
      {/* Main Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-fg truncate">{comm.name}</span>
          {isBnpl && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-purple-soft text-purple shrink-0">
              BNPL
            </span>
          )}
        </div>

        {isBnpl && (
          <p className="text-[11px] font-medium text-fg-muted tabular-figures">
            <span className="font-bold text-fg">{paidCount}</span> of <span className="font-bold text-fg">{comm.term_months}</span> paid
            <span className="text-line-strong mx-1.5">·</span>{formatMYR(bnplRemainingAmount)} remaining
          </p>
        )}

        {/* Meta Row: Status Pill + Account Info */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-fg-muted flex-wrap mt-0.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap uppercase tracking-wider ${pill.color}`}>
            {pill.label}
          </span>
          <span className="text-line-strong hidden sm:inline">·</span>
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3 text-fg-subtle shrink-0" />
            <span>From <strong className="text-fg">{account?.account_name || 'Unknown'}</strong></span>
          </span>
          <span className="text-line-strong">·</span>
          <span className="flex items-center gap-1">
            <Wallet className="w-3 h-3 text-fg-subtle shrink-0" />
            <span className={`tabular-figures ${accountShort ? 'text-warning-text font-semibold' : ''}`}>
              {formatMYR(accountBalance)} available
            </span>
          </span>
        </div>
      </div>

      {/* Amount & Actions */}
      <div className="shrink-0 flex flex-col items-end gap-2.5">
        <span className="text-base font-black text-fg whitespace-nowrap tabular-figures">
          {formatMYR(period.amount)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onMarkPaid}
            disabled={saving}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-success-text bg-success-soft hover:bg-success-soft/80 rounded-lg transition-all disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" /> Paid
          </button>
          <RowMenu actions={menuActions} ariaLabel={`${comm.name} actions`} />
        </div>
      </div>
    </div>
  )
}