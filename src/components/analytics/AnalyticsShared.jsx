// src/components/analytics/AnalyticsShared.jsx
import { X, Inbox } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { COLORS } from '../../utils/analyticsColors'

// ============================================================
// ONE SHARED TOOLTIP — used by all charts
// ============================================================
export const ChartTooltip = ({ active, payload, title, rows, footer }) => {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload

  return (
    <div className="bg-white/95 backdrop-blur-md px-3 py-2 border border-slate-100 rounded-xl shadow-xl">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {title ? title(data) : data.label}
      </p>
      {rows ? (
        rows(data).map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4 mt-0.5">
            <span className="text-[11px] font-semibold" style={{ color: r.color }}>
              {r.label}
            </span>
            <span className="text-xs font-black text-slate-800">
              {formatMYR(r.value)}
            </span>
          </div>
        ))
      ) : (
        <p className="text-sm font-black text-slate-800 mt-0.5">
          {formatMYR(data.total || data.value || 0)}
        </p>
      )}
      {footer && (
        <p className="text-[10px] font-medium text-slate-400 mt-1">
          {footer(data)}
        </p>
      )}
    </div>
  )
}

// ============================================================
// ONE SHARED TRANSACTION DRILL-DOWN
// ============================================================
export const TransactionDrilldown = ({
  title,
  total,
  transactions,
  accounts = [],
  onClose
}) => {
  if (!transactions || transactions.length === 0) return null

  const sorted = [...transactions].sort((a, b) => b.amount - a.amount)
  const top5 = sorted.slice(0, 5)
  const accountName = (id) => accounts.find(a => a.id === id)?.account_name || 'Unknown'

  return (
    <div className="mt-4 bg-slate-50/70 border border-slate-200 rounded-2xl p-4 animate-fadeIn">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-base font-black text-slate-800 mt-0.5">
            {formatMYR(total)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
          aria-label="Close drill-down"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        {top5.map(tx => (
          <div
            key={tx.id}
            className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-3 py-2"
          >
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-bold text-slate-800 truncate">
                {tx.description || 'Untitled'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {tx.category || 'Uncategorized'} · {accountName(tx.source_account_id)}
              </p>
            </div>
            <span className="text-xs font-black text-slate-800 shrink-0">
              {formatMYR(tx.amount)}
            </span>
          </div>
        ))}
      </div>

      {sorted.length > 5 && (
        <p className="text-[11px] font-semibold text-slate-400 text-center mt-3">
          + {sorted.length - 5} more transactions
        </p>
      )}
    </div>
  )
}

// ============================================================
// ONE SHARED ACCOUNT SELECT
// ============================================================
export const AccountSelect = ({ accounts = [], value, onChange, label = 'Account' }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="appearance-none bg-white border border-slate-200 rounded-xl py-2.5 pl-3 pr-9 text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all w-full"
    >
      <option value="all">All Accounts</option>
      {accounts.map(a => (
        <option key={a.id} value={a.id}>{a.account_name}</option>
      ))}
    </select>
    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
      ▾
    </span>
  </div>
)

// ============================================================
// ONE SHARED EMPTY STATE
// ============================================================
export const EmptyState = ({ icon: Icon = Inbox, title, message, action }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3 text-slate-300">
      <Icon className="w-6 h-6" />
    </div>
    <p className="text-sm font-bold text-slate-600">{title}</p>
    {message && (
      <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
        {message}
      </p>
    )}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
      >
        {action.icon && <action.icon className="w-3.5 h-3.5" />}
        {action.label}
      </button>
    )}
  </div>
)

// ============================================================
// ONE SHARED SKELETON
// ============================================================
export const CardSkeleton = ({ lines = 2 }) => (
  <div className="bg-white/60 border border-white/40 rounded-2xl p-4 animate-pulse">
    <div className="h-2.5 w-20 bg-slate-200 rounded-full" />
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`h-3 bg-slate-100 rounded-full mt-3 ${i === 0 ? 'w-3/4' : 'w-1/2'}`}
      />
    ))}
  </div>
)

export const ChartSkeleton = ({ height = 280 }) => (
  <div
    className="bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center"
    style={{ height }}
  >
    <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-400 rounded-full animate-spin" />
  </div>
)