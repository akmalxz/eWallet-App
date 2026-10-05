// src/components/analytics/AnalyticsShared.jsx
import { X, Inbox } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { AccountCard } from '../shared/AccountCard'

// ============================================================
// ONE SHARED TOOLTIP — used by all charts
// Rendered as HTML by Recharts, so Tailwind + semantic tokens
// work here. Series colors (r.color) are supplied by callers
// via the useChartTheme() palette.
// ============================================================
export const ChartTooltip = ({ active, payload, title, rows, footer }) => {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload

  return (
    <div className="bg-surface/95 backdrop-blur-md px-3 py-2 border border-line rounded-xl shadow-xl">
      <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
        {title ? title(data) : data.label}
      </p>
      {rows ? (
        rows(data).map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4 mt-0.5">
            <span className="text-[11px] font-semibold" style={{ color: r.color }}>
              {r.label}
            </span>
            <span className="text-xs font-black text-fg">
              {formatMYR(r.value)}
            </span>
          </div>
        ))
      ) : (
        <p className="text-sm font-black text-fg mt-0.5">
          {formatMYR(data.total || data.value || 0)}
        </p>
      )}
      {footer && (
        <p className="text-[10px] font-medium text-fg-subtle mt-1">
          {footer(data)}
        </p>
      )}
    </div>
  )
}

// ============================================================
// ONE SHARED TRANSACTION DRILL-DOWN
// Default behavior (unchanged): top 5 by amount, "+N more" line.
// Opt-in (scrollable + sortBy="date"): all rows in a fixed-height
// scroll region, chronological. Used by CalendarHeatmap and
// DayOfWeekBars; MainTrendChart keeps the defaults because
// weekly/monthly buckets are for outlier-spotting, not reading.
// ============================================================
export const TransactionDrilldown = ({
  title,
  total,
  transactions,
  accounts = [],
  onClose,
  sortBy = 'amount',
  scrollable = false
}) => {
  if (!transactions || transactions.length === 0) return null

  const sorted = [...transactions].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.transaction_date) - new Date(a.transaction_date)
    }
    return b.amount - a.amount
  })
  const visible = scrollable ? sorted : sorted.slice(0, 5)
  const hidden = scrollable ? 0 : Math.max(0, sorted.length - 5)
  const accountFor = (id) => accounts.find(a => a.id === id)

  const listBody = (
    <>
      {visible.map(tx => {
        const sourceAccount = accountFor(tx.source_account_id)
        return (
          <div
            key={tx.id}
            className="flex items-center justify-between bg-surface border border-line rounded-lg px-3 py-2"
          >
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-bold text-fg truncate">
                {tx.description || 'Untitled'}
              </p>
              <div className="flex items-center gap-2 mt-0.5 min-w-0">
                <span className="text-[10px] text-fg-subtle truncate shrink min-w-0">
                  {tx.category || 'Uncategorized'}
                </span>
                {sourceAccount && (
                  <AccountCard account={sourceAccount} size="chip" showIcon={false} />
                )}
              </div>
            </div>
            <span className="text-xs font-black text-fg shrink-0">
              {formatMYR(tx.amount)}
            </span>
          </div>
        )
      })}
    </>
  )

  return (
    <div className="mt-4 bg-surface-2/70 border border-line rounded-2xl animate-fadeIn">
      {/* Header stays fixed while the list scrolls */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div>
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
            {title}
          </p>
          <p className="text-base font-black text-fg mt-0.5">
            {formatMYR(total)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface transition-colors"
          aria-label="Close drill-down"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {scrollable ? (
        <div className="max-h-72 overflow-y-auto overscroll-contain scrollbar-thin px-4 pb-4 space-y-1.5">
          {listBody}
        </div>
      ) : (
        <>
          <div className="px-4 pb-4 space-y-1.5">{listBody}</div>
          {hidden > 0 && (
            <p className="text-[11px] font-semibold text-fg-subtle text-center pb-4 -mt-1">
              + {hidden} more transactions
            </p>
          )}
        </>
      )}
    </div>
  )
}

// Re-export the shared account picker
export { AccountDropdown as AccountSelect } from '../shared/AccountDropdown'

// ============================================================
// ONE SHARED EMPTY STATE
// ============================================================
export const EmptyState = ({ icon: Icon = Inbox, title, message, action }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="w-14 h-14 bg-surface-2 rounded-2xl flex items-center justify-center mb-3 text-fg-subtle">
      <Icon className="w-6 h-6" />
    </div>
    <p className="text-sm font-bold text-fg-muted">{title}</p>
    {message && (
      <p className="text-xs text-fg-subtle mt-1 max-w-xs leading-relaxed">
        {message}
      </p>
    )}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-solid hover:bg-brand-solid-hover text-white text-xs font-bold rounded-xl transition-colors"
      >
        {action.icon && <action.icon className="w-3.5 h-3.5" />}
        {action.label}
      </button>
    )}
  </div>
)

// ============================================================
// SKELETONS
// ============================================================
export const CardSkeleton = ({ lines = 2 }) => (
  <div className="bg-surface/60 border border-line/50 rounded-2xl p-4 animate-pulse">
    <div className="h-2.5 w-20 bg-surface-3 rounded-full" />
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`h-3 bg-surface-2 rounded-full mt-3 ${i === 0 ? 'w-3/4' : 'w-1/2'}`}
      />
    ))}
  </div>
)

export const ChartSkeleton = ({ height = 280 }) => (
  <div
    className="bg-surface-2 rounded-2xl animate-pulse flex items-center justify-center"
    style={{ height }}
  >
    <div className="w-10 h-10 border-2 border-line-strong border-t-brand rounded-full animate-spin" />
  </div>
)