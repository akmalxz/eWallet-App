// src/components/dashboard/CommitmentRadar.jsx
import { Target, ShieldCheck, AlertTriangle } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

export const CommitmentRadar = ({ radarStats }) => {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border p-6 relative overflow-hidden ${
      radarStats.isSafe ? 'border-slate-100' : 'border-red-200'
    }`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-500" /> {radarStats.name} Radar
          </h2>
          <p className="text-xs text-slate-500 mt-1">Fixed upcoming deductions.</p>
        </div>
        {radarStats.isSafe ? (
          <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <ShieldCheck className="w-4 h-4"/> SAFE
          </span>
        ) : (
          <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <AlertTriangle className="w-4 h-4"/> ALERT
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">Available</p>
          <p className="text-lg font-bold">{formatMYR(radarStats.currentBalance)}</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <p className="text-xs text-slate-500 mb-1">Required</p>
          <p className="text-lg font-bold">{formatMYR(radarStats.totalRequired)}</p>
        </div>
      </div>
      {!radarStats.isSafe && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Shortfall of {formatMYR(radarStats.shortfall)} detected
          </p>
        </div>
      )}
    </div>
  )
}