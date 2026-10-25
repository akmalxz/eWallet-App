// src/components/analytics/SpendingStructure.jsx
import { useMemo } from 'react'
import { formatMYR } from '../../utils/formatters'
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
    { label: 'Bills', pct: s.billsPct, color: theme.category[3] }, // usually red/orange
    { label: 'Everyday', pct: s.everydayPct, color: theme.category[0] }, // usually blue
    { label: 'Kept', pct: Math.max(0, s.keptPct), color: theme.down } // green
  ]

  return (
    <section className="space-y-3 mt-8">
      <div>
        <h3 className="text-sm font-bold text-fg">Where Your Income Goes</h3>
        <p className="text-xs text-fg-muted mt-0.5">
          Of every RM 100 you earned over finished months:
        </p>
      </div>

      {/* Stacked Bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-surface-2">
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${(p.pct / scale) * 100}%`, backgroundColor: p.color }} />
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {parts.map((p) => (
          <div key={p.label} className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">{p.label}</span>
            </div>
            {/* The percentage is also the amount per RM 100 */}
            <p className="text-sm font-black text-fg mt-1 tabular-figures">{formatMYR(p.pct)}</p>
          </div>
        ))}
      </div>

      {/* Warnings / Insights */}
      {s.keptPct < 0 && (
        <p className="text-xs text-fg-muted">
          You spent about {formatMYR(Math.abs(s.keptPct))} more than you earned for every RM 100 of income.
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