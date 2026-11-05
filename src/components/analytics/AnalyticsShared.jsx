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
    summary: 'A quick check-in on how your spending is going this cycle.',
    points: [
      { heading: 'Insights', text: 'Short sentences about your habits, such as which day you spend the most. They appear once you have about two weeks of data.' },
      { heading: 'Spending Trend', text: 'How much you spent over time. The dashed line is the previous period for comparison. Tap a point to see the purchases behind it.' }
    ]
  },
  trends: {
    title: 'About Trends',
    summary: 'Compare week-over-week spending pace and track daily spending against your safe target.',
    points: [
      {
        heading: 'Weekly Cycle Comparison',
        text: 'Pairs each week of your current pay cycle against the corresponding week of your last cycle. The cycle pace banner shows whether your spending is pacing higher or lower, and tapping any week reveals categorized transactions sorted by date.'
      },
      {
        heading: 'Daily Spending Calendar',
        text: 'A visual heatmap of your spending each day with gradients reflecting spending density. Pulsing green dots indicate days kept within your daily target, while pulsing red dots highlight days that exceeded it. Tap any day to inspect categorized transactions.'
      },
      {
        heading: 'Daily Target Calculation',
        text: 'By default, your target is calculated from your spendable liquid cash (all non-savings accounts minus upcoming unpaid commitments) divided by days until payday. Tap the target value anytime to customize it.'
      }
    ]
  },
  categories: {
    title: 'About Categories',
    summary: 'Track where your money goes on a daily, weekly, or monthly basis.',
    points: [
      {
        heading: 'Daily, Weekly & Monthly Lenses',
        text: 'Switch between viewing today’s spending, this week’s breakdown, or your full pay cycle. Use the arrows to step back in time and compare against the same pace in the previous period.'
      },
      {
        heading: 'Where Your Money Went',
        text: 'All categories ranked by spend with proportion bars and pace benchmarks. Tap any category to inspect subcategories, date-sorted purchases, and weekly rhythm across Monday to Sunday.'
      },
      {
        heading: 'Small Spends That Add Up',
        text: 'Surfaces recurring small purchases (like coffee, parking, snacks, or delivery) in the selected week or cycle that quietly accumulate into a larger total.'
      }
    ]
  },
  income: {
    title: 'About Income',
    summary: 'Shows how much of your pay you keep.',
    points: [
      { heading: 'Savings Rate', text: 'The share of your income left after spending. 20% means you kept RM 20 of every RM 100. Only finished cycles are counted.' },
      { heading: 'Where Your Income Goes', text: 'Splits every RM 100 you earned into Bills, Everyday spending, and money kept. If bills take more than half, it leaves less room to adjust day to day.' }
    ]
  }
}

export const PageInfo = ({ tab }) => {
  const [open, setOpen] = useState(false)
  const [prevTab, setPrevTab] = useState(tab)
  if (prevTab !== tab) {
    setPrevTab(tab)
    setOpen(false)
  }
  const panelId = useId()
  const info = PAGE_INFO[tab]

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
// TRANSACTION DRILL-DOWN (Updated cardless style)
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
    <div className="flex flex-col border-t border-line/40">
      {visible.map(tx => {
        const sourceAccount = accountFor(tx.source_account_id)
        return (
          <div
            key={tx.id}
            className="flex items-center justify-between py-2.5 pl-6 pr-1 border-b border-line/20 last:border-0"
          >
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-bold text-fg-muted truncate">
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
    <div className="animate-fadeIn mt-2">
      <div className="flex items-start justify-between pl-6 pr-1 py-3 bg-surface-2/30 rounded-lg">
        <div>
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
            {title} Breakdown
          </p>
          <p className="text-sm font-black text-fg mt-0.5 tabular-figures">
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
            <p className="text-[11px] font-semibold text-fg-subtle text-center py-3 border-t border-line/30">
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