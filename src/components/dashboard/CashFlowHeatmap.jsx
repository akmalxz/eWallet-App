// src/components/dashboard/CashFlowHeatmap.jsx
import { Target } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { formatMYR } from '../../utils/formatters'

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

export const CashFlowHeatmap = ({ cashFlowData }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Target className="w-4 h-4 text-blue-500" /> Cash Flow Heatmap
      </h2>
      <div className="h-64 w-full">
        {cashFlowData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={cashFlowData} 
                cx="50%" 
                cy="50%" 
                innerRadius={60} 
                outerRadius={90} 
                paddingAngle={5} 
                dataKey="value"
              >
                {cashFlowData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value) => formatMYR(value)} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            No verified expense data this month.
          </div>
        )}
      </div>
    </div>
  )
}