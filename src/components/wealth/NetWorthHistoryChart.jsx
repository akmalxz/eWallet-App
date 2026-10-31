// src/components/wealth/NetWorthHistoryChart.jsx
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip as RechartsTooltip, ReferenceLine
} from 'recharts'
import { formatMYR } from '../../utils/formatters'
import { useChartTheme } from '../../hooks/useChartTheme'

export const NetWorthHistoryChart = ({ history = [], hideMoney, loading }) => {
  const theme = useChartTheme()

  if (loading) {
    return (
      <div className="w-full px-1 pt-2">
        <div className="h-32 bg-surface-2 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!history || history.length === 0) return null

  const anyNegative = history.some(h => h.netWorth < 0)

  return (
    <div className="w-full">
      {hideMoney ? (
        <div className="px-5 py-12 text-center">
          <p className="text-xs text-fg-subtle">Chart hidden</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart
            data={history}
            margin={{ top: 10, right: 0, bottom: 0, left: 0 }}
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
      )}
    </div>
  )
}