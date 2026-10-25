// src/components/analytics/AnalyticsShared.jsx
import { useState, useEffect, useId } from 'react'
import { X, Inbox, Info } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { AccountCard } from '../shared/AccountCard'

// ============================================================
// PAGE INFO (What is this page?)
// ============================================================
const PAGE_INFO = {
  overview: {
    title: 'About Overview',
    summary: 'A quick check-in on how your spending is going this month.',
    points: [
      { heading: 'Insights', text: 'Short sentences about your habits, such as which day you spend the most. They appear once you have about two weeks of data.' },
      { heading: 'Spending Trend', text: 'How much you spent over time. The dashed line is the previous period for comparison. Tap a point to see the purchases behind it.' }
    ]
  },
  trends: {
    title: 'About Trends',
    summary: 'Shows when you spend, and helps you build better habits.',
    points: [
      { heading: 'Low-Spend Streaks', text: 'We find your "typical" daily spend and set a goal to stay under half of that amount. The calendar shows a flame icon on days you hit the goal.' },
      { heading: 'Grace Days', text: 'If you overspend or forget to log, you get one free pass (a snowflake icon) before your current streak resets. Use them wisely!' },
      { heading: 'Spending by Day of Week', text: 'Solid bars are this week. Faded bars are your average over the selected period.' }
    ]
  },
  categories: {
    title: 'About Categories',
    summary: 'Where your money goes, and where you can save.',
    points: [
      { heading: 'Small Spends That Add Up', text: 'Things you buy often, where each purchase is small but the total isn’t. Tap one to see every purchase.' },
      { heading: 'Where Your Money Went', text: 'Your top spending categories ranked by total amount. Tap any category to drill down into its sub-categories and individual transactions.' }
    ]
  },
  income: {
    title: 'About Income',
    summary: 'Shows how much of your pay you keep.',
    points: [
      { heading: 'Savings Rate', text: 'The share of your income left after spending. 20% means you kept RM 20 of every RM 100. Only finished months are counted.' },
      { heading: 'Where Your Income Goes', text: 'Splits every RM 100 you earned into Bills, Everyday spending, and money kept. If bills take more than half, it leaves less room to adjust day to day.' }
    ]
  }
}

export const PageInfo = ({ tab }) => {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const info = PAGE_INFO[tab]

  // Close the panel automatically when switching tabs
  useEffect(() => {
    setOpen(false)
  }, [tab])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!info) return null

  return (
    <div className="pt-2 pb-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-fg-subtle hover:text-fg transition-colors rounded-lg"
        style={{ minHeight: 32 }}
      >
        <Info className="w-3.5 h-3.5" />
        {open ? 'Hide explanation' : 'What is this page?'}
      </button>

      {open && (
        <div id={panelId} className="mt-2 bg-surface-2 border border-line rounded-xl p-4 animate-fadeIn">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-bold text-fg">{info.title}</p>
              <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">{info.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface transition-colors"
              aria-label="Close explanation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <ul className="space-y-2.5">
            {info.points.map((p) => (
              <li key={p.heading} className="text-xs text-fg-muted leading-relaxed">
                <strong className="text-fg font-semibold">{p.heading}.</strong> {p.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

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

export const ChartSkeleton = ({ height = 280 }) => (
  <div
    className="bg-surface-2 rounded-2xl animate-pulse"
    style={{ height }}
    aria-hidden="true"
  />
)

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