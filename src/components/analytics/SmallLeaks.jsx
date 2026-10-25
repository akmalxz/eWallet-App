// src/components/analytics/SmallLeaks.jsx
import { useState, useMemo } from 'react'
import { formatMYR } from '../../utils/formatters'
import { findSmallLeaks } from '../../utils/analytics/smallLeaks'
import { TransactionDrilldown } from './AnalyticsShared'

export const SmallLeaks = ({ expenses, periodMonths, accounts = [] }) => {
  const [openKey, setOpenKey] = useState(null)
  const leaks = useMemo(() => findSmallLeaks(expenses), [expenses])
  
  if (leaks.length === 0) return null
  const selected = leaks.find((l) => l.key === openKey)

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-fg">Small Spends That Add Up</h3>
        <p className="text-xs text-fg-muted mt-0.5">
          Things you buy often, each one small. Tap one to see every purchase.
        </p>
      </div>
      
      <div className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
        {leaks.map((l) => (
          <button
            key={l.key}
            onClick={() => setOpenKey((prev) => (prev === l.key ? null : l.key))}
            className="w-full text-left px-4 py-3 hover:bg-surface-2 transition-colors flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-fg truncate">{l.name}</p>
              <p className="text-[11px] text-fg-subtle tabular-figures">
                {l.count} purchases · about {formatMYR(l.avg)} each
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black text-fg tabular-figures">{formatMYR(l.total)}</p>
              <p className="text-[10px] text-fg-subtle tabular-figures">
                ≈ {formatMYR(l.total / periodMonths)} a month
              </p>
            </div>
          </button>
        ))}
      </div>
      
      {selected && (
        <TransactionDrilldown
          title={selected.name}
          total={selected.total}
          transactions={selected.txns}
          accounts={accounts}
          sortBy="date"
          scrollable
          onClose={() => setOpenKey(null)}
        />
      )}
    </section>
  )
}