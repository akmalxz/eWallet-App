// src/components/dashboard/CashFlowHeatmap.jsx
import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Plus, ArrowRight, PieChart } from 'lucide-react'
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer } from 'recharts'
import { formatMYR } from '../../utils/formatters'

const compactMYR = (n) => {
  const abs = Math.abs(n)
  if (abs >= 1000000) return `RM ${(n / 1000000).toFixed(1)}M`
  if (abs >= 1000) return `RM ${(n / 1000).toFixed(1)}k`
  return formatMYR(n)
}

const MOBILE_LIMIT = 6

export const CashFlowHeatmap = ({
  cashFlowData = [],
  onAddTransaction,
  onSeeTrends
}) => {
  const [activeName, setActiveName] = useState(null)
  const [showAll, setShowAll] = useState(false)

  const totalExpenses = useMemo(
    () => cashFlowData.reduce((sum, item) => sum + (item.value || 0), 0),
    [cashFlowData]
  )

  const activeItem = activeName
    ? cashFlowData.find(i => i.name === activeName)
    : null

  const handleSelect = (name) => {
    setActiveName(prev => (prev === name ? null : name))
  }

  return (
    <div className="relative flex flex-col h-full pt-3">

      {/* Accent strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-brand rounded-full" />

      {!cashFlowData || cashFlowData.length === 0 ? (
        <div className="pt-1">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-fg">Where your money went</h2>
            <p className="text-xs text-fg-subtle mt-0.5">This month</p>
          </div>
          <div className="h-56 flex flex-col items-center justify-center text-fg-subtle">
            <div className="w-14 h-14 bg-surface-2 border border-line rounded-2xl flex items-center justify-center mb-4 text-fg-subtle">
              <PieChart className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-fg">No spending yet this month</p>
            <p className="text-xs text-fg-subtle mt-1 text-center max-w-xs leading-relaxed">
              Log your first expense to see the breakdown.
            </p>
            <button
              onClick={onAddTransaction}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-brand-solid hover:bg-brand-solid-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Log expense
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex justify-between items-start mb-4 border-b border-line pb-3 pt-1 gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-fg">Where your money went</h2>
              <p className="text-xs text-fg-subtle mt-0.5">This month</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-fg-subtle uppercase font-bold tracking-wider mb-0.5">Total spent</p>
              <p className="text-base font-black text-fg" title={formatMYR(totalExpenses)}>
                {compactMYR(totalExpenses)}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-5 md:gap-6">

            {/* Donut */}
            <div className="relative w-44 h-44 md:w-48 md:h-48 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={cashFlowData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={78}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(entry) => handleSelect(entry.name)}
                  >
                    {cashFlowData.map((entry, idx) => {
                      const isActive = activeName === entry.name
                      const dim = activeName && !isActive
                      return (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry.color || '#94a3b8'}
                          stroke="var(--surface)"
                          strokeWidth={2}
                          className="outline-none transition-opacity duration-200 cursor-pointer"
                          opacity={dim ? 0.35 : 1}
                        />
                      )
                    })}
                  </Pie>
                </RechartsPie>
              </ResponsiveContainer>

              <button
                onClick={() => setActiveName(null)}
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 cursor-pointer"
                aria-label="Clear selection"
              >
                <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider truncate w-24">
                  {activeItem ? activeItem.name : 'Outflow'}
                </p>
                <p className="text-sm font-black text-fg tracking-tight truncate w-28 mt-0.5"
                   title={activeItem ? formatMYR(activeItem.value) : formatMYR(totalExpenses)}>
                  {activeItem ? compactMYR(activeItem.value) : compactMYR(totalExpenses)}
                </p>
                <p className="text-[10px] font-bold text-brand mt-0.5">
                  {activeItem
                    ? `${((activeItem.value / totalExpenses) * 100).toFixed(1)}%`
                    : `${cashFlowData.length} categories`
                  }
                </p>
              </button>
            </div>

            {/* Ledger list */}
            <div className="flex-1 w-full">
              <div className={`space-y-1.5 ${showAll ? 'md:max-h-64 md:overflow-y-auto md:pr-1' : ''}`}>
                {(showAll ? cashFlowData : cashFlowData.slice(0, MOBILE_LIMIT)).map((item) => {
                  const pct = ((item.value / totalExpenses) * 100).toFixed(1)
                  const isActive = activeName === item.name
                  const cmp = item.comparison

                  return (
                    <button
                      key={item.name}
                      onClick={() => handleSelect(item.name)}
                      className={`w-full text-left flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-surface-2 border-line shadow-sm'
                          : 'bg-transparent border-transparent hover:border-line hover:bg-surface-2/40'
                      }`}
                      style={{ minHeight: 44 }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: item.color }} />
                        <div className="min-w-0 flex-1">
                          <span className={`text-xs font-semibold truncate text-fg-muted block ${
                            isActive ? 'text-fg font-bold' : ''
                          }`}>
                            {item.name}
                          </span>
                          {cmp && (
                            <span className={`text-[10px] font-bold flex items-center gap-0.5 mt-0.5 ${
                              cmp.isNew ? 'text-brand'
                              : cmp.diff > 0 ? 'text-danger'
                              : 'text-success'
                            }`}>
                              {cmp.isNew ? (
                                <>New</>
                              ) : (
                                <>
                                  {cmp.diff > 0
                                    ? <TrendingUp className="w-2.5 h-2.5" />
                                    : <TrendingDown className="w-2.5 h-2.5" />}
                                  {cmp.diff > 0 ? '+' : ''}{Math.abs(cmp.pct ?? 0).toFixed(0)}%
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2 text-right">
                        <span className="text-xs font-black text-fg">{formatMYR(item.value)}</span>
                        <span className="text-[10px] font-bold text-fg-subtle bg-surface-2 border border-line px-1.5 py-0.5 rounded-md min-w-[42px] text-center">
                          {pct}%
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {cashFlowData.length > MOBILE_LIMIT && (
                <button
                  onClick={() => setShowAll(s => !s)}
                  className="md:hidden w-full mt-2 py-2 text-xs font-bold text-fg-muted hover:text-fg transition-colors"
                  style={{ minHeight: 44 }}
                >
                  {showAll ? 'Show less' : `Show ${cashFlowData.length - MOBILE_LIMIT} more`}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* See trends link */}
      {onSeeTrends && (
        <button
          onClick={onSeeTrends}
          className="w-full mt-auto pt-3 border-t border-line flex items-center justify-center gap-1.5 text-xs font-bold text-fg-muted hover:text-fg transition-colors"
          style={{ minHeight: 44 }}
        >
          See trends <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}