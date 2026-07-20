// src/components/dashboard/CashFlowHeatmap.jsx
import { useState, useMemo } from 'react'
import { Target, TrendingUp, Plus } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { formatMYR } from '../../utils/formatters'

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

// Custom interactive glass-morphism tooltip
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white/90 backdrop-blur-md px-3 py-2 border border-slate-100 rounded-xl shadow-xl animate-fadeIn">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{data.name}</p>
        <p className="text-sm font-black text-slate-800 mt-0.5">{formatMYR(data.value)}</p>
      </div>
    )
  }
  return null
}

export const CashFlowHeatmap = ({ cashFlowData = [], onAddTransaction }) => {
  const [activeItem, setActiveItem] = useState(null)

  // Memoize total sum to ensure high performance updates
  const totalExpenses = useMemo(() => {
    return cashFlowData.reduce((sum, item) => sum + (item.value || 0), 0)
  }, [cashFlowData])

  const onPieEnter = (_, index) => {
    setActiveItem(cashFlowData[index])
  }

  const onPieLeave = () => {
    setActiveItem(null)
  }

  if (!cashFlowData || cashFlowData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 md:p-6 transition-all duration-300 shadow-slate-100/40">
        <div className="absolute top-0 inset-x-0 h-1 bg-slate-300" />
        <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-500" /> Cash Flow Heatmap
        </h2>
        <div className="h-56 flex flex-col items-center justify-center text-slate-400">
          <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-300 shadow-sm shadow-slate-100/40">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">No Expense Data This Month</p>
          <p className="text-xs text-slate-400 mt-1 text-center max-w-xs leading-relaxed">
            Start logging your dynamic expenses to unlock the macro category breakdown visualization matrix.
          </p>
          <button 
            onClick={onAddTransaction}
            className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Log Expense
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 md:p-6 transition-all duration-300 shadow-slate-100/40 relative overflow-hidden">
      {/* Top Accent Graphic Strip */}
      <div className="absolute top-0 inset-x-0 h-1 bg-blue-500" />
      
      {/* Header Layout */}
      <div className="flex justify-between items-center mb-5 border-b border-slate-50 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            Cash Flow Heatmap
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Macro category distribution</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Total Outflow</p>
          <p className="text-base font-black text-slate-800">{formatMYR(totalExpenses)}</p>
        </div>
      </div>

      {/* Responsive Row/Column Layout Framework */}
      <div className="flex flex-col md:flex-row items-center gap-6">
        
        {/* Left Side: Chart Container with Dynamic Center Value Readout */}
        <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={cashFlowData} 
                cx="50%" 
                cy="50%" 
                innerRadius={62} 
                outerRadius={84} 
                paddingAngle={3} 
                dataKey="value"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {cashFlowData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CHART_COLORS[index % CHART_COLORS.length]} 
                    className="outline-none stroke-white stroke-2 transition-all duration-300 cursor-pointer hover:opacity-90"
                  />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Dynamic Center Metrics Box */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate w-24">
              {activeItem ? activeItem.name : 'Outflow'}
            </p>
            <p className="text-sm font-black text-slate-800 tracking-tight truncate w-28 mt-0.5">
              {activeItem ? formatMYR(activeItem.value) : formatMYR(totalExpenses)}
            </p>
            <p className="text-[9px] font-bold text-blue-500 mt-0.5">
              {activeItem 
                ? `${((activeItem.value / totalExpenses) * 100).toFixed(1)}%`
                : `${cashFlowData.length} Sectors`
              }
            </p>
          </div>
        </div>

        {/* Right Side: Clean Percentage Distribution Ledger List */}
        <div className="flex-1 w-full space-y-2 md:max-h-48 md:overflow-y-auto pr-1">
          {cashFlowData.map((item, index) => {
            const percentage = ((item.value / totalExpenses) * 100).toFixed(1)
            const color = CHART_COLORS[index % CHART_COLORS.length]
            const isTargeted = activeItem && activeItem.name === item.name

            return (
              <div 
                key={item.name}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-200 ${
                  isTargeted 
                    ? 'bg-slate-50 border-slate-200/80 shadow-sm' 
                    : 'bg-white border-transparent hover:border-slate-100 hover:bg-slate-50/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Category Square Indicator */}
                  <div 
                    className="w-3 h-3 rounded-md shrink-0 transition-transform" 
                    style={{ backgroundColor: color }}
                  />
                  <span className={`text-xs font-semibold truncate text-slate-700 ${isTargeted ? 'text-slate-900 font-bold' : ''}`}>
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2 text-right">
                  <span className="text-xs font-black text-slate-800">{formatMYR(item.value)}</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md min-w-[42px] text-center">
                    {percentage}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}