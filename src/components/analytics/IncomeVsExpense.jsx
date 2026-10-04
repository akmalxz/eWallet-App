// src/components/analytics/IncomeVsExpense.jsx
import { useMemo } from 'react'
import { Wallet, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts'
import { formatMYR } from '../../utils/formatters'
import { monthKey, lastNMonths } from '../../utils/dateHelpers'
import { useChartTheme } from '../../hooks/useChartTheme'
import { ChartTooltip, EmptyState } from './AnalyticsShared'

export const IncomeVsExpense = ({
  income,
  expenses,
  periodMonths,
  accounts = [],
  selectedAccountId = 'all',
  accountLabel = 'All accounts',
  onAddIncome
}) => {
  const theme = useChartTheme()

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
  const isScoped = selectedAccountId !== 'all'

  const rateColor = (() => {
    if (stats.savingsRate === null) return theme.neutral
    if (stats.savingsRate >= 20) return theme.down
    if (stats.savingsRate >= 0) return '#f59e0b'
    return theme.up
  })()

  if (!hasIncome) {
    return (
      <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-6 shadow-sm">
        <EmptyState
          icon={Wallet}
          title={isScoped ? `No income for ${accountLabel}` : 'No income logged yet'}
          message={
            isScoped
              ? `Try switching to All accounts, or log income for ${accountLabel}.`
              : 'Log an income transaction to unlock savings rate analytics.'
          }
          action={
            !isScoped && onAddIncome
              ? { label: 'Log Income', icon: TrendingUp, onClick: onAddIncome }
              : null
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Hero savings rate */}
      <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-6 shadow-sm text-center">
        <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
          Savings Rate
        </p>
        <p className="text-4xl font-black mt-1" style={{ color: rateColor }}>
          {stats.savingsRate !== null ? `${stats.savingsRate.toFixed(0)}%` : '—'}
        </p>
        <p className="text-xs text-fg-subtle mt-1">
          The share of your income you kept.
        </p>
        <p className="text-xs text-fg-muted mt-3 max-w-md mx-auto">
          {isScoped ? (
            <>
              For <strong>{accountLabel}</strong>: you saved <strong>{formatMYR(stats.net)}</strong> out
              of <strong>{formatMYR(stats.totalIncome)}</strong> income over the last {periodMonths} months.
            </>
          ) : (
            <>
              You saved <strong>{formatMYR(stats.net)}</strong> out of{' '}
              <strong>{formatMYR(stats.totalIncome)}</strong> income over the last {periodMonths} months.
            </>
          )}
        </p>
      </div>

      {/* 3 summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-2xl p-3 text-center">
          <p className="text-[9px] font-bold text-fg-subtle uppercase tracking-wider">Avg Income</p>
          <p className="text-sm font-black mt-1 break-all" style={{ color: theme.down }}>
            {formatMYR(stats.avgIncome)}
          </p>
        </div>
        <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-2xl p-3 text-center">
          <p className="text-[9px] font-bold text-fg-subtle uppercase tracking-wider">Avg Expense</p>
          <p className="text-sm font-black mt-1 break-all" style={{ color: theme.up }}>
            {formatMYR(stats.avgExpense)}
          </p>
        </div>
        <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-2xl p-3 text-center">
          <p className="text-[9px] font-bold text-fg-subtle uppercase tracking-wider">Net</p>
          <p
            className="text-sm font-black mt-1 break-all"
            style={{ color: stats.net >= 0 ? theme.down : theme.up }}
          >
            {formatMYR(stats.net)}
          </p>
        </div>
      </div>

      {/* Paired monthly bars */}
      <div className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 md:p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-sm font-bold text-fg">Income vs Expense</h3>
          <span className="text-[10px] font-semibold text-fg-subtle shrink-0">
            {accountLabel}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={months} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: theme.axis }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: theme.axis }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
            />
            <RechartsTooltip
              content={
                <ChartTooltip
                  rows={(d) => [
                    { label: 'Income',  value: d.income,  color: theme.down },
                    { label: 'Expense', value: d.expense, color: theme.up }
                  ]}
                  footer={(d) => {
                    const net = d.income - d.expense
                    return `Net: ${formatMYR(net)}`
                  }}
                />
              }
              cursor={{ fill: theme.cursor, fillOpacity: 0.08 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8, color: theme.axis }}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="income"  fill={theme.down} radius={[4, 4, 0, 0]} name="Income" />
            <Bar dataKey="expense" fill={theme.up}   radius={[4, 4, 0, 0]} name="Expense" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}