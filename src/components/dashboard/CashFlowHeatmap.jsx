// src/components/dashboard/CashFlowHeatmap.jsx
import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Plus, ArrowRight, PieChart, ChevronDown, ChevronUp, X } from 'lucide-react'
import { 
  PieChart as RechartsPie, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts'
import { formatMYR } from '../../utils/formatters'
import { useChartTheme } from '../../hooks/useChartTheme'
import { useTheme } from '../../hooks/useTheme'
import { getCategoryColor } from '../../utils/analytics/categoryColors'
import { EmptyState } from '../analytics/AnalyticsShared'
import { AnimatedNumber } from '../shared/AnimatedNumber'

const compactMYR = (n) => {
  const abs = Math.abs(n)
  if (abs >= 1000000) return `RM ${(n / 1000000).toFixed(1)}M`
  if (abs >= 1000) return `RM ${(n / 1000).toFixed(1)}k`
  return formatMYR(n)
}

const MOBILE_LIMIT = 6

// ============================================================
// SUB-CATEGORY DRILLDOWN
// ============================================================
function SubCategoryDrilldown({ title, total, txns, accounts, onClose }) {
  const [expandedSub, setExpandedSub] = useState(null)

  const groups = useMemo(() => {
    const map = new Map()
    txns.forEach(tx => {
      const parts = (tx.category || 'Uncategorized').split(' > ')
      const sub = parts.length > 1 ? parts[1] : parts[0]
      if (!map.has(sub)) map.set(sub, { name: sub, total: 0, txns: [] })
      const g = map.get(sub)
      g.total += Number(tx.amount) || 0
      g.txns.push(tx)
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [txns])

  return (
    <div className="mt-4 bg-surface border border-line rounded-2xl overflow-hidden animate-fadeIn">
      <div className="flex items-start justify-between px-4 py-4 border-b border-line bg-surface-2/30">
        <div>
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
            {title} Breakdown
          </p>
          <p className="text-base font-black text-fg mt-0.5 tabular-figures">
            {formatMYR(total)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors"
          aria-label="Close drill-down"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-line">
        {groups.map((group) => {
          const isExpanded = expandedSub === group.name
          const pct = (group.total / total) * 100

          return (
            <div key={group.name}>
              <button
                onClick={() => setExpandedSub(isExpanded ? null : group.name)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ChevronDown className={`w-3.5 h-3.5 text-fg-subtle transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  <span className="text-sm font-bold text-fg">{group.name}</span>
                  <span className="text-[10px] font-bold text-fg-subtle bg-surface-2 px-1.5 py-0.5 rounded">
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <span className="text-sm font-bold text-fg tabular-figures">
                  {formatMYR(group.total)}
                </span>
              </button>

              {isExpanded && (
                <div className="bg-surface-2/30 border-t border-line divide-y divide-line/50">
                  {group.txns.map(tx => {
                    const account = accounts.find(a => a.id === tx.source_account_id)
                    return (
                      <div key={tx.id} className="flex items-center justify-between px-4 py-2.5 pl-10">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-fg truncate">{tx.description || 'Untitled'}</p>
                          <p className="text-[10px] text-fg-subtle">
                            {new Date(tx.transaction_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                            {account && ` · ${account.account_name}`}
                          </p>
                        </div>
                        <span className="text-xs font-black text-fg shrink-0 tabular-figures">
                          {formatMYR(tx.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================
const CashFlowHeatmapSkeleton = () => (
  <div className="relative flex flex-col h-full pt-3">
    <div className="absolute top-0 left-0 right-0 h-1 bg-line-strong rounded-full" />
    <div className="flex justify-between items-start mb-4 border-b border-line pb-3 pt-1 gap-3">
      <div className="space-y-1.5">
        <div className="h-4 w-32 bg-surface-3 rounded-full animate-pulse" />
        <div className="h-3 w-16 bg-surface-2 rounded-full animate-pulse" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-20 bg-surface-2 rounded-full animate-pulse ml-auto" />
        <div className="h-4 w-16 bg-surface-3 rounded-full animate-pulse ml-auto" />
      </div>
    </div>
    <div className="flex flex-col md:flex-row items-center gap-5 md:gap-6">
      <div className="w-44 h-44 md:w-48 md:h-48 rounded-full bg-surface-2 animate-pulse shrink-0" />
      <div className="flex-1 w-full space-y-1.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-11 bg-surface-2 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  </div>
)

export const CashFlowHeatmap = ({
  cashFlowData = [],
  accounts = [],
  isLoading = false,
  onAddTransaction,
  onSeeTrends
}) => {
  const theme = useChartTheme()
  const { resolved } = useTheme()
  const isDark = resolved === 'dark'

  const [activeName, setActiveName] = useState(null)
  const [showAll, setShowAll] = useState(false)

  const totalExpenses = useMemo(
    () => cashFlowData.reduce((sum, item) => sum + (item.value || 0), 0),
    [cashFlowData]
  )

  const coloredData = useMemo(
    () => cashFlowData.map((row) => ({
      ...row,
      color: getCategoryColor(row.name, isDark)
    })),
    [cashFlowData, isDark]
  )

  const donutData = useMemo(() => coloredData.slice(0, MOBILE_LIMIT), [coloredData])
  const listData = useMemo(() => showAll ? coloredData : coloredData.slice(0, MOBILE_LIMIT), [coloredData, showAll])

  if (isLoading) return <CashFlowHeatmapSkeleton />

  const activeItem = activeName ? coloredData.find(i => i.name === activeName) : null
  const handleSelect = (name) => setActiveName(prev => (prev === name ? null : name))
  
  // Find the active index for Recharts to expand the slice
  const activeIndex = activeName ? donutData.findIndex(d => d.name === activeName) : -1

  return (
    <div className="relative flex flex-col h-full pt-3">
      <div className="absolute top-0 left-0 right-0 h-1 bg-brand rounded-full" />

      {!coloredData || coloredData.length === 0 ? (
        <div className="pt-1">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-fg">Where your money went</h2>
            <p className="text-xs text-fg-subtle mt-0.5">This month</p>
          </div>
          <EmptyState
            icon={PieChart}
            title="No spending yet this month"
            message="Log your first expense to see the breakdown."
            action={{ label: 'Log expense', icon: Plus, onClick: onAddTransaction }}
            compact
          />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start mb-4 border-b border-line pb-3 pt-1 gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-fg">Where your money went</h2>
              <p className="text-xs text-fg-subtle mt-0.5">This month</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-fg-subtle uppercase font-bold tracking-wider mb-0.5">Total spent</p>
              <p className="text-base font-black text-fg tabular-figures" title={formatMYR(totalExpenses)}>
                {formatMYR(totalExpenses)}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-5 md:gap-6">
            
            {/* Centered on mobile, left-aligned on desktop */}
            <div className="relative w-44 h-44 md:w-48 md:h-48 shrink-0 flex items-center justify-center md:sticky md:top-4 mx-auto md:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    activeIndex={activeIndex >= 0 ? activeIndex : undefined}
                    activeShape={{ outerRadius: 84 }} // Pops out the selected slice
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={78}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(entry) => handleSelect(entry.name)}
                    className="cursor-pointer outline-none"
                  >
                    {donutData.map((entry, idx) => {
                      const isActive = activeName === entry.name
                      const dim = activeName && !isActive
                      return (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry.color}
                          stroke="var(--surface)"
                          strokeWidth={2}
                          className="outline-none transition-opacity duration-200"
                          opacity={dim ? 0.35 : 1}
                        />
                      )
                    })}
                  </Pie>

                  {/* Tooltip on hover */}
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-surface border border-line rounded-xl shadow-lg p-2.5 text-xs z-50">
                          <p className="font-bold text-fg mb-0.5">{data.name}</p>
                          <p className="text-fg-muted tabular-figures">{formatMYR(data.value)}</p>
                        </div>
                      )
                    }}
                  />
                </RechartsPie>
              </ResponsiveContainer>

              {/* Center Text - Now pointer-events-none so slices are clickable */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
                <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider truncate w-24">
                  {activeItem ? activeItem.name : 'Outflow'}
                </p>
                <p className="text-sm font-black text-fg tracking-tight truncate w-28 mt-0.5 tabular-figures">
                  <AnimatedNumber value={activeItem ? activeItem.value : totalExpenses} format={compactMYR} />
                </p>
                
                {activeItem ? (
                  <button
                    onClick={() => setActiveName(null)}
                    className="pointer-events-auto flex items-center gap-1 mt-1 text-[10px] font-bold text-brand hover:text-brand-hover bg-brand-soft/50 px-2 py-0.5 rounded-md transition-colors"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                ) : (
                  <p className="text-[10px] font-bold text-brand mt-0.5 tabular-figures">
                    {coloredData.length} categories
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 w-full">
              <div className="space-y-1.5">
                {listData.map((item) => {
                  const pct = ((item.value / totalExpenses) * 100).toFixed(1)
                  const isActive = activeName === item.name
                  const cmp = item.comparison

                  return (
                    <button
                      key={item.name}
                      onClick={() => handleSelect(item.name)}
                      className={`w-full text-left flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isActive ? 'bg-surface-2 border-line shadow-sm' : 'bg-transparent border-transparent hover:border-line hover:bg-surface-2/40'
                      }`}
                      style={{ minHeight: 44 }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: item.color }} />
                        <div className="min-w-0 flex-1">
                          <span className={`text-xs font-semibold truncate text-fg-muted block ${isActive ? 'text-fg font-bold' : ''}`}>
                            {item.name}
                          </span>
                          {cmp && (
                            <span className={`text-[10px] font-bold flex items-center gap-0.5 mt-0.5 ${
                              cmp.isNew ? 'text-brand' : cmp.diff > 0 ? 'text-danger' : 'text-success'
                            }`}>
                              {cmp.isNew ? (<>New</>) : (
                                <>
                                  {cmp.diff > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                  {cmp.diff > 0 ? '+' : ''}{Math.abs(cmp.pct ?? 0).toFixed(0)}%
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2 text-right">
                        <span className="text-xs font-black text-fg tabular-figures">
                          {formatMYR(item.value)}
                        </span>
                        <span className="text-[10px] font-bold text-fg-subtle bg-surface-2 border border-line px-1.5 py-0.5 rounded-md min-w-[42px] text-center tabular-figures">
                          {pct}%
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {coloredData.length > MOBILE_LIMIT && (
                <button
                  onClick={() => setShowAll(s => !s)}
                  className="w-full mt-2 py-2 text-xs font-bold text-fg-muted hover:text-fg transition-colors"
                  style={{ minHeight: 44 }}
                >
                  {showAll ? 'Show less' : `Show ${coloredData.length - MOBILE_LIMIT} more categories`}
                </button>
              )}
            </div>
          </div>

          {activeItem && activeItem.txns && activeItem.txns.length > 0 && (
            <SubCategoryDrilldown
              title={activeItem.name}
              total={activeItem.value}
              txns={activeItem.txns}
              accounts={accounts}
              onClose={() => setActiveName(null)}
            />
          )}
        </>
      )}

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