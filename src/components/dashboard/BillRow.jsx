// src/components/dashboard/BillRow.jsx
import {
  Calendar, AlertTriangle, Building2, Wallet, Check, SkipForward
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { getPeriodPill } from '../../utils/commitments/commitmentPill'
import { toMYDate } from '../../utils/dateHelpers'
import { RowMenu } from '../shared/RowMenu'

/**
 * The primary bill row. Handles both recurring and BNPL. The Skip
 * button is hidden for BNPL rows — you can't skip an instalment.
 *
 * The menu actions array is built by the caller so the row doesn't
 * need to know about editing / pausing / deleting.
 */
export const BillRow = ({
  period,
  account,
  paidCount,
  saving,
  onMarkPaid,
  onSkip,
  menuActions
}) => {
  const comm = period.commitment
  const accountBalance = account?.balance ?? 0
  const nowMY = toMYDate(new Date())
  const pill = getPeriodPill(period, nowMY)
  const isOverdue = period.daysOverdue > 0
  const accountShort = period.accountShort
  const isBnpl = comm.kind === 'bnpl' && comm.term_months != null
  const bnplRemainingAmount = isBnpl
    ? Math.max(0, (Number(comm.amount) || 0) * (comm.term_months - paidCount))
    : 0

  const rowClass = isOverdue
    ? 'bg-danger-soft/50 border-danger-border'
    : accountShort
      ? 'bg-warning-soft/50 border-warning-border'
      : 'bg-surface border-line hover:border-line-strong'

  return (
    <div className={`rounded-xl transition-all border shadow-sm p-4 ${rowClass}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
              isOverdue ? 'bg-danger/15 text-danger' : 'bg-surface-2 text-fg-subtle'
            }`}
          >
            {isOverdue
              ? <AlertTriangle className="w-4 h-4" />
              : <Calendar className="w-4 h-4" />}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-fg truncate">{comm.name}</span>
              {isBnpl && (
                <span
                  className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-purple-soft text-purple border border-purple/30 shrink-0"
                  aria-label="Buy Now Pay Later plan"
                >
                  BNPL
                </span>
              )}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap uppercase tracking-wider ${pill.color}`}
              >
                {pill.label}
              </span>
            </div>

            {isBnpl && (
              <p className="text-[11px] font-medium text-fg-muted">
                <span className="font-bold text-fg">{paidCount}</span>
                {' of '}
                <span className="font-bold text-fg">{comm.term_months}</span>
                {' paid'}
                <span className="text-line-strong mx-1.5">·</span>
                {formatMYR(bnplRemainingAmount)} remaining
              </p>
            )}

            <div className="flex items-center gap-1.5 text-[11px] font-medium text-fg-muted flex-wrap">
              <Building2 className="w-3 h-3 text-fg-subtle shrink-0" />
              <span>
                From{' '}
                <strong className="text-fg">{account?.account_name || 'Unknown'}</strong>
              </span>
              <span className="text-line-strong">·</span>
              <Wallet className="w-3 h-3 text-fg-subtle shrink-0" />
              <span className={accountShort ? 'text-warning-text font-semibold' : ''}>
                {formatMYR(accountBalance)} available
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-line pt-3 sm:pt-0">
          <span className="text-base font-black text-fg whitespace-nowrap">
            {formatMYR(period.amount)}
          </span>

          <div className="flex items-center gap-1.5">
            {!isBnpl && (
              <button
                onClick={onSkip}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-fg-muted bg-surface-2 hover:bg-surface-3 border border-line rounded-lg transition-all disabled:opacity-50"
                style={{ minHeight: 44 }}
                title="Skip this month"
                aria-label={`Skip ${comm.name} for this period`}
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Skip</span>
              </button>
            )}

            <button
              onClick={onMarkPaid}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-success-text bg-success-soft hover:bg-success-soft/80 border border-success-border rounded-lg transition-all shadow-sm disabled:opacity-50"
              style={{ minHeight: 44 }}
            >
              <Check className="w-3.5 h-3.5" /> Paid
            </button>

            <RowMenu actions={menuActions} ariaLabel={`${comm.name} actions`} />
          </div>
        </div>
      </div>
    </div>
  )
}