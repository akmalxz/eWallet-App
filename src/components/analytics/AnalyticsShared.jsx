// src/components/analytics/AnalyticsShared.jsx
import { X, Inbox } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { AccountCard } from '../shared/AccountCard'

// ============================================================
// TOOLTIP
// ============================================================
export const ChartTooltip = ({ active, payload, title, rows, footer }) => {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload

  return (
    <div className="bg-surface px-3 py-2 border border-line rounded-xl shadow-xl">
      <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
        {title ? title(data) : data.label}
      </p>
      {rows ? (
        rows(data).map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4 mt-0.5">
            <span className="text-[11px] font-semibold" style={{ color: r.color }}>
              {r.label}
            </span>
            <span className="text-xs font-black text-fg tabular-figures">
              {formatMYR(r.value)}
            </span>
          </div>
        ))
      ) : (
        <p className="text-sm font-black text-fg mt-0.5 tabular-figures">
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
// TRANSACTION DRILL-DOWN
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
    <div className="divide-y divide-line">
      {visible.map(tx => {
        const sourceAccount = accountFor(tx.source_account_id)
        return (
          <div
            key={tx.id}
            className="flex items-center justify-between px-3 py-2.5"
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
            <span className="text-xs font-black text-fg shrink-0 tabular-figures">
              {formatMYR(tx.amount)}
            </span>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="mt-4 bg-surface border border-line rounded-2xl overflow-hidden animate-fadeIn">
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-line">
        <div>
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
            {title}
          </p>
          <p className="text-base font-black text-fg mt-0.5 tabular-figures">
            {formatMYR(total)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors"
          aria-label="Close drill-down"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {scrollable ? (
        <div className="max-h-72 overflow-y-auto overscroll-contain scrollbar-thin">
          {listBody}
        </div>
      ) : (
        <>
          {listBody}
          {hidden > 0 && (
            <p className="text-[11px] font-semibold text-fg-subtle text-center py-3 border-t border-line">
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
// EMPTY STATE
// ============================================================
export const EmptyState = ({
  icon: Icon = Inbox,
  title,
  message,
  hint,
  action,
  compact = false
}) => (
  <div
    className={`flex flex-col items-center justify-center text-center ${
      compact ? 'py-6' : 'py-10'
    }`}
  >
    <div
      className={`bg-surface-2 rounded-2xl flex items-center justify-center mb-3 text-fg-subtle ${
        compact ? 'w-12 h-12' : 'w-14 h-14'
      }`}
    >
      <Icon className={compact ? 'w-5 h-5' : 'w-6 h-6'} />
    </div>

    <p className="text-sm font-bold text-fg-muted">{title}</p>

    {message && (
      <p className="text-xs text-fg-subtle mt-1 max-w-xs leading-relaxed">
        {message}
      </p>
    )}

    {hint && (
      <p className="text-[11px] text-fg-subtle/70 mt-2 max-w-xs leading-relaxed">
        {hint}
      </p>
    )}

    {action && (
      <button
        onClick={action.onClick}
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-solid hover:bg-brand-solid-hover text-white text-xs font-bold rounded-xl transition-colors"
        style={{ minHeight: 40 }}
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

// Metric card placeholder — pulse-only, no card chrome.
export const CardSkeleton = ({ lines = 2 }) => (
  <div className="animate-pulse py-3">
    <div className="h-2.5 w-20 bg-surface-2 rounded-full" />
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`h-3 bg-surface-2 rounded-full mt-3 ${i === 0 ? 'w-3/4' : 'w-1/2'}`}
      />
    ))}
  </div>
)

// Chart placeholder — flat pulse block.
export const ChartSkeleton = ({ height = 280 }) => (
  <div
    className="bg-surface-2 rounded-2xl animate-pulse"
    style={{ height }}
    aria-hidden="true"
  />
)

// Row list skeleton — flat rows in a grouped container.
export const ListSkeleton = ({ rows = 3, height = 56 }) => (
  <div
    className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden"
    aria-hidden="true"
  >
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="bg-surface-2/40 animate-pulse"
        style={{ height }}
      />
    ))}
  </div>
)