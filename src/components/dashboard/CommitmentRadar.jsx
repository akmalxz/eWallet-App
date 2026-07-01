// src/components/dashboard/CommitmentRadar.jsx
import { Target, ShieldCheck, AlertTriangle, Calendar, Clock, Plus, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

export const CommitmentRadar = ({ 
  radarStats, 
  commitments = [], 
  onAddCommitment, 
  onDeleteCommitment,
  onToggleCommitment,
  onEditCommitment 
}) => {
  const {
    currentBalance = 0,
    totalRequired = 0,
    isSafe = true,
    shortfall = 0,
    name = 'eWallet'
  } = radarStats || {}

  // Get today's date
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  // Sort commitments by due date
  const sortedCommitments = [...commitments].sort((a, b) => a.due_day_of_month - b.due_day_of_month)

  // Get days until due
  const getDaysUntil = (dueDay) => {
    if (dueDay >= currentDay) {
      return dueDay - currentDay
    } else {
      return (daysInMonth - currentDay) + dueDay
    }
  }

  // Get status for commitment
  const getCommitmentStatus = (dueDay) => {
    const daysUntil = getDaysUntil(dueDay)
    if (daysUntil === 0) return { label: 'Due today!', color: 'text-red-500', bg: 'bg-red-100' }
    if (daysUntil <= 3) return { label: `${daysUntil}d left`, color: 'text-amber-500', bg: 'bg-amber-100' }
    if (daysUntil <= 7) return { label: `${daysUntil}d left`, color: 'text-blue-500', bg: 'bg-blue-100' }
    return { label: `Day ${dueDay}`, color: 'text-slate-400', bg: 'bg-slate-100' }
  }

  // Active commitments only
  const activeCommitments = sortedCommitments.filter(c => c.is_active)
  const inactiveCommitments = sortedCommitments.filter(c => !c.is_active)

  return (
    <div className={`bg-white rounded-2xl shadow-sm border p-6 relative overflow-hidden ${
      isSafe ? 'border-slate-100' : 'border-red-200'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-500" /> {name} Radar
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Track your subscriptions & bills</p>
        </div>
        <div className="flex items-center gap-2">
          {onAddCommitment && (
            <button 
              onClick={onAddCommitment}
              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
              title="Add commitment"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
            isSafe ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}>
            {isSafe ? <ShieldCheck className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
            {isSafe ? 'SAFE' : 'ALERT'}
          </div>
        </div>
      </div>

      {/* Balance vs Required */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Available</p>
          <p className={`text-lg font-bold ${currentBalance < 100 ? 'text-red-500' : 'text-slate-900'}`}>
            {formatMYR(currentBalance)}
          </p>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Required</p>
          <p className="text-lg font-bold text-slate-900">{formatMYR(totalRequired)}</p>
        </div>
      </div>

      {/* Active Commitments */}
      <div className="mb-3">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Active Commitments ({activeCommitments.length})
        </p>
        {activeCommitments.length === 0 ? (
          <div className="text-xs text-slate-400 p-2 bg-slate-50 rounded-lg">
            No active commitments. Add one using the + button.
          </div>
        ) : (
          <div className="space-y-1.5">
            {activeCommitments.map(comm => {
              const status = getCommitmentStatus(comm.due_day_of_month)
              return (
                <div key={comm.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="text-sm font-medium text-slate-700 truncate">{comm.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800 whitespace-nowrap">{formatMYR(comm.amount)}</span>
                    <div className="flex items-center gap-0.5">
                      {onToggleCommitment && (
                        <button 
                          onClick={() => onToggleCommitment(comm.id, comm.is_active)}
                          className="text-slate-300 hover:text-red-500 p-0.5 rounded transition-colors"
                          title="Deactivate"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      )}
                      {onDeleteCommitment && (
                        <button 
                          onClick={() => onDeleteCommitment(comm.id)}
                          className="text-slate-300 hover:text-red-500 p-0.5 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Inactive Commitments */}
      {inactiveCommitments.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Inactive ({inactiveCommitments.length})</p>
          <div className="space-y-1">
            {inactiveCommitments.map(comm => (
              <div key={comm.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 line-through">{comm.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 line-through">{formatMYR(comm.amount)}</span>
                  <button 
                    onClick={() => onToggleCommitment(comm.id, comm.is_active)}
                    className="text-slate-300 hover:text-emerald-500 p-0.5 rounded transition-colors"
                    title="Activate"
                  >
                    <CheckCircle className="w-3 h-3" />
                  </button>
                  {onDeleteCommitment && (
                    <button 
                      onClick={() => onDeleteCommitment(comm.id)}
                      className="text-slate-300 hover:text-red-500 p-0.5 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning */}
      {!isSafe && totalRequired > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Insufficient funds!</strong> Shortfall of {formatMYR(shortfall)}
            </span>
          </p>
          <p className="text-xs text-red-600 mt-1 ml-6">
            💡 You need to add {formatMYR(shortfall)} to cover upcoming commitments
          </p>
        </div>
      )}

      {isSafe && totalRequired > 0 && currentBalance < totalRequired * 1.2 && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Low buffer:</strong> Only {formatMYR(currentBalance - totalRequired)} buffer after commitments
            </span>
          </p>
        </div>
      )}

      {/* Summary */}
      {commitments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] text-slate-400">
            {activeCommitments.length} active • Total {formatMYR(totalRequired)}/month
          </p>
        </div>
      )}
    </div>
  )
}