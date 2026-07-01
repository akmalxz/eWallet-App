// src/components/dashboard/CommitmentRadar.jsx
import { Target, ShieldCheck, AlertTriangle, Calendar, Clock, Plus, Trash2, Check, CheckCircle, XCircle } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

export const CommitmentRadar = ({ 
  radarStats, 
  commitments = [], 
  onAddCommitment, 
  onDeleteCommitment,
  onToggleCommitment,
  onEditCommitment,
  onMarkAsPaid 
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
  const currentMonth = today.getMonth()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

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

  // Sort commitments by due date
  const sortedCommitments = [...commitments].sort((a, b) => a.due_day_of_month - b.due_day_of_month)

  // Separate commitments
  const activeCommitments = sortedCommitments.filter(c => c.is_active)
  const inactiveCommitments = sortedCommitments.filter(c => !c.is_active)
  
  // ✅ Split active commitments into unpaid and paid
  const unpaidCommitments = activeCommitments.filter(c => c.last_paid_month !== currentMonth)
  const paidCommitments = activeCommitments.filter(c => c.last_paid_month === currentMonth)

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

      {/* ✅ Unpaid Commitments */}
      <div className="mb-3">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Upcoming ({unpaidCommitments.length})
        </p>
        {unpaidCommitments.length === 0 ? (
          <div className="text-xs text-emerald-500 p-2 bg-emerald-50 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> All commitments paid for this month! 🎉
          </div>
        ) : (
          <div className="space-y-1.5">
            {unpaidCommitments.map(comm => {
              const status = getCommitmentStatus(comm.due_day_of_month)
              const isOverdue = getDaysUntil(comm.due_day_of_month) < 0
              
              return (
                <div key={comm.id} className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                  isOverdue ? 'bg-red-50 border border-red-200' : 'bg-slate-50 hover:bg-slate-100'
                }`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isOverdue ? (
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                    )}
                    <span className="text-sm font-medium truncate text-slate-700">
                      {comm.name}
                    </span>
                    {isOverdue && (
                      <span className="text-[10px] text-red-500 font-medium shrink-0">Overdue</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold whitespace-nowrap text-slate-800">
                      {formatMYR(comm.amount)}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {onMarkAsPaid && (
                        <button 
                          onClick={() => onMarkAsPaid(comm.id)}
                          className="text-emerald-500 hover:text-emerald-700 p-0.5 rounded transition-colors"
                          title="Mark as paid"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
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

      {/* ✅ Paid Commitments - NEW SECTION */}
      {paidCommitments.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-500" /> Paid This Month ({paidCommitments.length})
          </p>
          <div className="space-y-1">
            {paidCommitments.map(comm => (
              <div key={comm.id} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-slate-500 line-through">{comm.name}</span>
                </div>
                <span className="text-sm text-slate-400 line-through">{formatMYR(comm.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <strong>Insufficient funds!</strong> Shortfall of {formatMYR(shortfall)} for upcoming commitments
            </span>
          </p>
          <p className="text-xs text-red-600 mt-1 ml-6">
            💡 You need to add {formatMYR(shortfall)} to cover remaining commitments
          </p>
        </div>
      )}

      {/* Summary */}
      {commitments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] text-slate-400">
            {activeCommitments.length} active • {unpaidCommitments.length} unpaid • {paidCommitments.length} paid
          </p>
        </div>
      )}
    </div>
  )
}