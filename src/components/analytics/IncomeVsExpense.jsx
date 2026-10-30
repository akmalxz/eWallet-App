// src/components/analytics/IncomeVsExpense.jsx
import { useMemo } from 'react'
import { Wallet, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts'
import { formatMYR } from '../../utils/formatters'
import { lastNCycles, toMYDate } from '../../utils/dateHelpers' // <-- Changed
import { useChartTheme } from '../../hooks/useChartTheme'
import { ChartTooltip, EmptyState } from './AnalyticsShared'

export const IncomeVsExpense = ({
  income,
  expenses,
  periodMonths,
  accounts = [],
  selectedAccountId = 'all',
  accountLabel = 'All accounts',
  onAddIncome,
  profile // <-- Added
}) => {
  const theme = useChartTheme()

  const { months, stats } = useMemo(() => {
    const now = new Date()
    
    // Use pay cycles instead of calendar months
    const cycleList = lastNCycles(periodMonths, now, profile?.payday_type, profile?.payday_date)
    const data = cycleList.map(c => ({ 
      key: c.key, 
      label: c.label, 
      start: c.startDate, 
      end: c.endDate, 
      income: 0, 
      expense: 0 
    }))

    // Helper to find which cycle a transaction belongs to
    const findCycle = (txDate) => {
      const d = toMYDate(txDate)
      return data.find(c => d >= c.start && d <= c.end)
    }

    income.forEach(tx => {
      const cycle = findCycle(tx.transaction_date)
      if (cycle) cycle.income += Number(tx.amount) || 0
    })
    expenses.forEach(tx => {
      const cycle = findCycle(tx.transaction_date)
      if (cycle) cycle.expense += Number(tx.amount) || 0
    })

    // Find the current cycle key to exclude it from totals
    const currentCycle = lastNCycles(1, now, profile?.payday_type, profile?.payday_date)[0]
    const currentCycleKey = currentCycle.key

    // Only include completed cycles in the stats
    const completed = data.filter(d => d.key !== currentCycleKey)

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
  }, [income, expenses, periodMonths, profile?.payday_type, profile?.payday_date])

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
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-2">
        <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
          Savings Rate
        </p>
        <p className="text-4xl font-black mt-1 tracking-tighter tabular-figures" style={{ color: rateColor }}>
          {stats.savingsRate !== null ? `${stats.savingsRate.toFixed(0)}%` : '—'}
        </p>
        <p className="text-xs text-fg-subtle mt-1">
          The share of your income you kept.
        </p>
        <p className="text-xs text-fg-muted mt-3 max-w-md mx-auto leading-relaxed">
          {isScoped ? (
            <>
              For <strong>{accountLabel}</strong>: you saved{' '}
              <strong className="tabular-figures">{formatMYR(stats.net)}</strong> out of{' '}
              <strong className="tabular-figures">{formatMYR(stats.totalIncome)}</strong>{' '}
              income over the last {periodMonths} cycles.
            </>
          ) : (
            <>
              You saved <strong className="tabular-figures">{formatMYR(stats.net)}</strong> out of{' '}
              <strong className="tabular-figures">{formatMYR(stats.totalIncome)}</strong>{' '}
              income over the last {periodMonths} cycles.
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-line border-y border-line py-4">
        <div className="text-center">
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">Avg Income</p>
          <p className="text-sm font-black mt-1 break-all tabular-figures" style={{ color: theme.down }}>
            {formatMYR(stats.avgIncome)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">Avg Expense</p>
          <p className="text-sm font-black mt-1 break-all tabular-figures" style={{ color: theme.up }}>
            {formatMYR(stats.avgExpense)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">Net</p>
          <p className="text-sm font-black mt-1 break-all tabular-figures" style={{ color: stats.net >= 0 ? theme.down : theme.up }}>
            {formatMYR(stats.net)}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-bold text-fg">Income vs Expense</h3>
          <span className="text-[10px] font-semibold text-fg-subtle shrink-0">
            {accountLabel}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={months} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: theme.axis }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: theme.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)} />
            <RechartsTooltip
              content={
                <ChartTooltip
                  rows={(d) => [
                    { label: 'Income',  value: d.income,  color: theme.down },
                    { label: 'Expense', value: d.expense, color: theme.up }
                  ]}
                  footer={(d) => `Net: ${formatMYR(d.income - d.expense)}`}
                />
              }
              cursor={{ fill: theme.cursor, fillOpacity: 0.08 }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: theme.axis }} iconType="circle" iconSize={8} />
            <Bar dataKey="income"  fill={theme.down} radius={[4, 4, 0, 0]} name="Income" />
            <Bar dataKey="expense" fill={theme.up}   radius={[4, 4, 0, 0]} name="Expense" />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}