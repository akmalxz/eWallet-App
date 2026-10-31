// src/components/wealth/NetWorthHistoryChart.jsx
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip as RechartsTooltip, ReferenceLine
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { useChartTheme } from '../../hooks/useChartTheme'

export const NetWorthHistoryChart = ({ history = [], monthDelta, hideMoney, loading }) => {
  const theme = useChartTheme()

  if (loading) {
    return (
      <div className="bg-surface border border-line rounded-2xl p-5">
        <div className="h-3 w-24 bg-surface-2 rounded-full animate-pulse mb-3" />
        <div className="h-8 w-40 bg-surface-3 rounded-full animate-pulse mb-4" />
        <div className="h-32 bg-surface-2 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!history || history.length === 0) return null

  const current = history[history.length - 1]?.netWorth || 0
  const isNegative = current < 0
  const anyNegative = history.some(h => h.netWorth < 0)

  const deltaValue = monthDelta?.value || 0
  const deltaUp = deltaValue > 0.01
  const deltaDown = deltaValue < -0.01
  const DeltaIcon = deltaUp ? TrendingUp : deltaDown ? TrendingDown : Minus
  const deltaColor = deltaUp ? 'text-success' : deltaDown ? 'text-danger' : 'text-fg-subtle'

  return (
    <section className="bg-surface border border-line rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
          Net worth trend
        </p>
        <div className="flex items-baseline gap-3 mt-1">
          <p
            className={`text-2xl font-black tabular-figures ${
              isNegative ? 'text-danger' : 'text-fg'
            }`}
          >
            {hideMoney ? '••••••' : formatMYR(current)}
          </p>
          {monthDelta && (
            <span className={`inline-flex items-center gap-1 text-xs font-bold ${deltaColor}`}>
              <DeltaIcon className="w-3.5 h-3.5" />
              {hideMoney
                ? '••••'
                : `${deltaUp ? '+' : deltaDown ? '−' : ''}${formatMYR(Math.abs(deltaValue))}`}
              <span className="text-fg-subtle font-medium">this month</span>
            </span>
          )}
        </div>
      </div>

      {hideMoney ? (
        <div className="px-5 py-8 text-center">
          <p className="text-xs text-fg-subtle">Chart hidden</p>
        </div>
      ) : (
        <div className="px-2 pt-4 pb-2">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={history}
              margin={{ top: 8, right: 16, bottom: 4, left: 16 }}
            >
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.current} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={theme.current} stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: theme.axis }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                hide
                domain={anyNegative ? ['auto', 'auto'] : [0, 'auto']}
              />
              {anyNegative && (
                <ReferenceLine y={0} stroke={theme.grid} strokeDasharray="3 3" />
              )}

              <RechartsTooltip
                cursor={{ stroke: theme.cursor, strokeWidth: 1, strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-surface border border-line rounded-lg shadow-xl px-2.5 py-1.5">
                      <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
                        {d.label}
                      </p>
                      <p className={`text-sm font-black tabular-figures ${d.netWorth < 0 ? 'text-danger' : 'text-fg'}`}>
                        {formatMYR(d.netWorth)}
                      </p>
                    </div>
                  )
                }}
              />

              <Area
                type="monotone"
                dataKey="netWorth"
                stroke={theme.current}
                strokeWidth={2}
                fill="url(#nwGrad)"
                activeDot={{ r: 5, fill: theme.current, stroke: theme.dotStroke, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}