// src/components/analytics/SpendingStructure.jsx
import { useMemo } from 'react'
import { useChartTheme } from '../../hooks/useChartTheme'
import { computeStructure } from '../../utils/analytics/structure'

export const SpendingStructure = ({ income, expenses, everyday }) => {
  const theme = useChartTheme()
  
  const s = useMemo(
    () => computeStructure(income, expenses, everyday),
    [income, expenses, everyday]
  )
  
  if (!s) return null

  const scale = Math.max(100, s.billsPct + s.everydayPct)
  
  const parts = [
    { label: 'Bills', pct: s.billsPct, color: theme.category[3] },
    { label: 'Everyday', pct: s.everydayPct, color: theme.category[0] },
    { label: 'Kept', pct: Math.max(0, s.keptPct), color: theme.down }
  ]

  return (
    <section className="space-y-3 mt-8">
      <div>
        <h3 className="text-sm font-bold text-fg">Where Your Income Goes</h3>
        <p className="text-xs text-fg-muted mt-0.5">
          Of every RM 100 you earned over finished cycles:
        </p>
      </div>

      {/* Stacked Bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-surface-2">
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${(p.pct / scale) * 100}%`, backgroundColor: p.color }} />
        ))}
      </div>

      {/* Stats — shares, not amounts. Each value is a percentage of
          income (e.g. 35 = 35 sen of every RM 1 earned), so it must
          NOT be run through formatMYR — that would print "RM 35.00"
          and read as an absolute amount. */}
      <div className="grid grid-cols-3 gap-2">
        {parts.map((p) => (
          <div key={p.label} className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">{p.label}</span>
            </div>
            <p className="text-sm font-black text-fg mt-1 tabular-figures">{p.pct.toFixed(0)}%</p>
          </div>
        ))}
      </div>

      {/* Warnings / Insights */}
      {s.keptPct < 0 && (
        <p className="text-xs text-fg-muted">
          You spent about {Math.abs(s.keptPct).toFixed(0)}% more than you earned.
        </p>
      )}
      {s.billsPct > 50 && (
        <p className="text-xs text-fg-muted">
          Bills take more than half of your income, which leaves less room to adjust day to day.
        </p>
      )}
    </section>
  )
}