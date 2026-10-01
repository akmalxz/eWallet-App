// src/components/analytics/MainTrendChart.jsx
import { useState, useMemo, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, ReferenceLine
} from 'recharts'
import { formatMYR } from '../../utils/formatters'
import {
  toMYDate, startOfWeekMY, monthKey
} from '../../utils/dateHelpers'
import { COLORS } from '../../utils/analyticsColors'
import { ChartTooltip, TransactionDrilldown, EmptyState } from './AnalyticsShared'

const defaultGranularity = (period) => (period === 3 ? 'daily' : 'weekly')

const GRANULARITY_OPTIONS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' }
]

export const MainTrendChart = ({ expenses, periodMonths, accounts = [] }) => {
  const [granularity, setGranularity] = useState(defaultGranularity(periodMonths))
  const [selectedBucketKey, setSelectedBucketKey] = useState(null)

  // Reset granularity when the period changes. Was a useMemo side effect.
  useEffect(() => {
    setGranularity(defaultGranularity(periodMonths))
  }, [periodMonths])

  const { currentBuckets, previousBuckets, peakBucket, avg, isEmpty } = useMemo(() => {
    const now = new Date()
    const nowMY = toMYDate(now)

    let bucketCount, bucketKeyFn, bucketLabelFn, bucketStartFn

    if (granularity === 'daily') {
      bucketCount = periodMonths * 30
      bucketStartFn = (offset) => {
        const d = new Date(Date.UTC(nowMY.getUTCFullYear(), nowMY.getUTCMonth(), nowMY.getUTCDate() - offset))
        return d
      }
      bucketKeyFn = (d) => d.toISOString().slice(0, 10)
      bucketLabelFn = (d) =>
        d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    } else if (granularity === 'weekly') {
      bucketCount = periodMonths * 4
      bucketStartFn = (offset) => {
        const d = new Date(Date.UTC(nowMY.getUTCFullYear(), nowMY.getUTCMonth(), nowMY.getUTCDate() - offset * 7))
        const dow = d.getUTCDay()
        const diff = dow === 0 ? -6 : 1 - dow
        d.setUTCDate(d.getUTCDate() + diff)
        return d
      }
      bucketKeyFn = (d) => d.toISOString().slice(0, 10)
      bucketLabelFn = (d) =>
        d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    } else {
      bucketCount = periodMonths
      bucketStartFn = (offset) => {
        const d = new Date(Date.UTC(nowMY.getUTCFullYear(), nowMY.getUTCMonth() - offset, 1))
        return d
      }
      bucketKeyFn = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      bucketLabelFn = (d) =>
        d.toLocaleDateString('en-MY', { month: 'short', timeZone: 'UTC' })
    }

    const current = []
    for (let i = bucketCount - 1; i >= 0; i--) {
      const start = bucketStartFn(i)
      current.push({
        key: bucketKeyFn(start),
        label: bucketLabelFn(start),
        startMY: start,
        total: 0,
        transactions: []
      })
    }

    const previous = []
    for (let i = bucketCount - 1; i >= 0; i--) {
      const start = bucketStartFn(i + bucketCount)
      previous.push({
        key: bucketKeyFn(start),
        label: bucketLabelFn(start),
        total: 0,
        transactions: []
      })
    }

    expenses.forEach((tx) => {
      const txDate = new Date(tx.transaction_date)

      const bucketIdx = (() => {
        if (granularity === 'daily') {
          const daysAgo = Math.floor(
            (nowMY.getTime() - toMYDate(txDate).getTime()) / (1000 * 60 * 60 * 24)
          )
          return bucketCount - 1 - daysAgo
        } else if (granularity === 'weekly') {
          const start = startOfWeekMY(txDate)
          return current.findIndex((b) => b.key === bucketKeyFn(toMYDate(start)))
        } else {
          return current.findIndex((b) => b.key === monthKey(txDate))
        }
      })()

      if (bucketIdx >= 0 && bucketIdx < current.length) {
        current[bucketIdx].total += Number(tx.amount) || 0
        current[bucketIdx].transactions.push(tx)
      } else {
        const pIdx = (() => {
          if (granularity === 'daily') {
            const daysAgo = Math.floor(
              (nowMY.getTime() - toMYDate(txDate).getTime()) / (1000 * 60 * 60 * 24)
            )
            return bucketCount * 2 - 1 - daysAgo
          } else if (granularity === 'weekly') {
            const start = startOfWeekMY(txDate)
            return previous.findIndex((b) => b.key === bucketKeyFn(toMYDate(start)))
          } else {
            return previous.findIndex((b) => b.key === monthKey(txDate))
          }
        })()
        if (pIdx >= 0 && pIdx < previous.length) {
          previous[pIdx].total += Number(tx.amount) || 0
        }
      }
    })

    const merged = current.map((b, i) => ({
      ...b,
      previousTotal: previous[i]?.total || 0
    }))

    const nonZero = current.filter((b) => b.total > 0)
    const isEmpty = nonZero.length === 0

    const peak = current.reduce(
      (best, b) => (b.total > best.total ? b : best),
      current[0] || { total: 0 }
    )

    const avgVal = current.length > 0
      ? current.slice(0, -1).reduce((s, b) => s + b.total, 0) / Math.max(1, current.length - 1)
      : 0

    return {
      currentBuckets: merged,
      previousBuckets: previous,
      peakBucket: peak,
      avg: avgVal,
      isEmpty
    }
  }, [expenses, periodMonths, granularity])

  const selectedBucket = selectedBucketKey
    ? currentBuckets.find((b) => b.key === selectedBucketKey)
    : null

  const granularityIndex = GRANULARITY_OPTIONS.findIndex((o) => o.id === granularity)

  return (
    <section className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-5 md:p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Spending Trend</h2>
          {!isEmpty && peakBucket?.total > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              Peak {granularity === 'daily' ? 'day' : granularity === 'weekly' ? 'week' : 'month'}:{' '}
              <strong>{peakBucket.label}</strong> at <strong>{formatMYR(peakBucket.total)}</strong>
            </p>
          )}
        </div>

        <div className="relative flex items-center h-11 rounded-lg bg-slate-100/80 border border-slate-200/60 p-0.5">
          <div
            className="absolute top-0.5 bottom-0.5 left-0.5 pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              width: `calc((100% - 0.25rem) / ${GRANULARITY_OPTIONS.length})`,
              transform: `translateX(${granularityIndex * 100}%)`
            }}
          >
            <div className="h-full w-full rounded-md bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]" />
          </div>

          {GRANULARITY_OPTIONS.map((opt) => {
            const isActive = granularity === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setGranularity(opt.id)}
                className={`relative z-10 flex-1 px-2.5 h-full rounded-md text-xs font-bold transition-colors duration-200 ${
                  isActive ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={TrendingUp}
          title="No spending in this period"
          message="Try a longer period or remove the account filter."
        />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={currentBuckets}
            margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
            onClick={(e) => {
              if (e && e.activePayload && e.activePayload.length) {
                const key = e.activePayload[0].payload.key
                setSelectedBucketKey((prev) => (prev === key ? null : key))
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
              domain={[0, 'auto']}
            />

            <RechartsTooltip
              content={
                <ChartTooltip
                  rows={(d) => [
                    { label: 'This period', value: d.total, color: COLORS.current },
                    { label: 'Previous', value: d.previousTotal, color: COLORS.prev }
                  ]}
                  footer={(d) => {
                    const diff = d.total - d.previousTotal
                    if (d.previousTotal === 0) return 'No comparison'
                    const pct = ((diff / d.previousTotal) * 100).toFixed(0)
                    return `${diff >= 0 ? '+' : ''}${pct}% vs previous`
                  }}
                />
              }
              cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
            />

            {avg > 0 && (
              <ReferenceLine
                y={avg}
                stroke={COLORS.neutral}
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `avg ${formatMYR(avg)}`,
                  position: 'insideTopRight',
                  fontSize: 10,
                  fill: COLORS.neutral
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="previousTotal"
              stroke={COLORS.prev}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
            />

            <Line
              type="monotone"
              dataKey="total"
              stroke={COLORS.current}
              strokeWidth={3}
              dot={(props) => {
                const isPeak = props.payload.key === peakBucket?.key
                if (isPeak) {
                  return (
                    <circle
                      key={props.key}
                      cx={props.cx}
                      cy={props.cy}
                      r={5}
                      fill={COLORS.up}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  )
                }
                return <circle key={props.key} cx={props.cx} cy={props.cy} r={0} fill="transparent" />
              }}
              activeDot={{ r: 6, fill: COLORS.current, stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {selectedBucket && (
        <TransactionDrilldown
          title={selectedBucket.label}
          total={selectedBucket.total}
          transactions={selectedBucket.transactions}
          accounts={accounts}
          onClose={() => setSelectedBucketKey(null)}
        />
      )}
    </section>
  )
}