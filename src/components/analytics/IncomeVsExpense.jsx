// src/components/analytics/IncomeVsExpense.jsx
import { useMemo } from 'react'
import { Wallet, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts'
import { formatMYR } from '../../utils/formatters'
import { monthKey, lastNMonths } from '../../utils/dateHelpers'
import { COLORS } from '../../utils/analyticsColors'
import { ChartTooltip, EmptyState } from './AnalyticsShared'

export const IncomeVsExpense = ({ income, expenses, periodMonths, onAddIncome }) => {
  const { months, stats } = useMemo(() => {
    const now = new Date()
    const monthList = lastNMonths(periodMonths, now)
    const data = monthList.map(m => ({ key: m.key, label: m.label, income: 0, expense: 0 }))

    const byKey = Object.fromEntries(data.map(d => [d.key, d]))

    income.forEach(tx => {
      const k = monthKey(tx.transaction_date)
      if (byKey[k]) byKey[k].income += Number(tx.amount) || 0
    })
    expenses.forEach(tx => {
      const k = monthKey(tx.transaction_date)
      if (byKey[k]) byKey[k].expense += Number(tx.amount) || 0
    })

    // Complete months only for averages
    const currentMonthKey = monthKey(now)
    const completed = data.filter(d => d.key !== currentMonthKey)

    const totalIncome = completed.reduce((s, d) => s + d.income, 0)
    const totalExpense = completed.reduce((s, d) => s + d.expense, 0)
    const net = totalIncome - totalExpense
    const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : null

    const avgIncome = completed.length > 0 ? totalIncome / completed.length : 0
    const avgExpense = completed.length > 0 ? totalExpense / completed.length : 0

    return {
      months: data,
      stats: { totalIncome, totalExpense, net, savingsRate, avgIncome, avgExpense }
    }
  }, [income, expenses, periodMonths])

  const hasIncome = stats.totalIncome > 0

  // Color the savings rate
  const rateColor = (() => {
    if (stats.savingsRate === null) return COLORS.neutral
    if (stats.savingsRate >= 20) return COLORS.down
    if (stats.savingsRate >= 0) return '#f59e0b'
    return COLORS.up
  })()

  if (!hasIncome) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
        <EmptyState
          icon={Wallet}
          title="No income logged yet"
          message="Log an income transaction to unlock savings rate analytics."
          action={onAddIncome ? { label: 'Log Income', icon: TrendingUp, onClick: onAddIncome } : null}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Hero savings rate */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm text-center">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Savings Rate
        </p>
        <p className="text-4xl font-black mt-1" style={{ color: rateColor }}>
          {stats.savingsRate !== null ? `${stats.savingsRate.toFixed(0)}%` : '—'}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          The share of your income you kept.
        </p>
        <p className="text-xs text-slate-500 mt-3 max-w-md mx-auto">
          You saved <strong>{formatMYR(stats.net)}</strong> out of{' '}
          <strong>{formatMYR(stats.totalIncome)}</strong> income over the last {periodMonths} months.
        </p>
      </div>

      {/* 3 summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-3 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg Income</p>
          <p className="text-sm font-black text-emerald-600 mt-1 break-all">
            {formatMYR(stats.avgIncome)}
          </p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-3 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg Expense</p>
          <p className="text-sm font-black text-red-500 mt-1 break-all">
            {formatMYR(stats.avgExpense)}
          </p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-3 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Net</p>
          <p
            className="text-sm font-black mt-1 break-all"
            style={{ color: stats.net >= 0 ? COLORS.down : COLORS.up }}
          >
            {formatMYR(stats.net)}
          </p>
        </div>
      </div>

      {/* Paired monthly bars */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-5 md:p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Income vs Expense</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={months} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
            />
            <RechartsTooltip
              content={
                <ChartTooltip
                  rows={(d) => [
                    { label: 'Income', value: d.income, color: COLORS.down },
                    { label: 'Expense', value: d.expense, color: COLORS.up }
                  ]}
                  footer={(d) => {
                    const net = d.income - d.expense
                    return `Net: ${formatMYR(net)}`
                  }}
                />
              }
              cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="income" fill={COLORS.down} radius={[4, 4, 0, 0]} name="Income" />
            <Bar dataKey="expense" fill={COLORS.up} radius={[4, 4, 0, 0]} name="Expense" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}