// src/components/dashboard/CommitmentRadar.jsx
import { useState } from 'react'
import { Target, ShieldCheck, AlertTriangle, Calendar, Clock, Plus, Trash2, Check, CheckCircle, XCircle, ChevronDown, ChevronUp, Info } from 'lucide-react'
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
  const [showPaid, setShowPaid] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const {
    currentBalance = 0,
    totalRequired = 0,
    isSafe = true,
    shortfall = 0,
    name = 'eWallet'
  } = radarStats || {}

  const today = new Date()
  const currentDay = today.getDate()
  const currentMonth = today.getMonth()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  const getDaysUntil = (dueDay) => {
    if (dueDay >= currentDay) {
      return dueDay - currentDay
    } else {
      return (daysInMonth - currentDay) + dueDay
    }
  }

  const getCommitmentStatus = (dueDay) => {
    const daysUntil = getDaysUntil(dueDay)
    if (daysUntil === 0) return { label: 'Due today!', color: 'text-red-500', bg: 'bg-red-100' }
    if (daysUntil <= 3) return { label: `${daysUntil}d left`, color: 'text-amber-500', bg: 'bg-amber-100' }
    if (daysUntil <= 7) return { label: `${daysUntil}d left`, color: 'text-blue-500', bg: 'bg-blue-100' }
    return { label: `Day ${dueDay}`, color: 'text-slate-400', bg: 'bg-slate-100' }
  }

  const sortedCommitments = [...commitments].sort((a, b) => a.due_day_of_month - b.due_day_of_month)
  const activeCommitments = sortedCommitments.filter(c => c.is_active)
  const inactiveCommitments = sortedCommitments.filter(c => !c.is_active)
  const unpaidCommitments = activeCommitments.filter(c => c.last_paid_month !== currentMonth)
  const paidCommitments = activeCommitments.filter(c => c.last_paid_month === currentMonth)

  // Simplified summary for mobile
  const hasUpcoming = unpaidCommitments.length > 0
  const hasPaid = paidCommitments.length > 0
  const hasInactive = inactiveCommitments.length > 0

  return (
    <div className={`bg-white rounded-2xl shadow-sm border p-4 md:p-6 relative overflow-hidden ${
      isSafe ? 'border-slate-100' : 'border-red-200'
    }`}>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
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
              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
              title="Add commitment"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 ${
            isSafe ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}>
            {isSafe ? <ShieldCheck className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
            {isSafe ? 'SAFE' : 'ALERT'}
          </div>
        </div>
      </div>

      {/* Quick Stats - Simplified */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Available</p>
          <p className="text-sm font-bold text-slate-900">{formatMYR(currentBalance)}</p>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Required</p>
          <p className="text-sm font-bold text-slate-900">{formatMYR(totalRequired)}</p>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Due</p>
          <p className="text-sm font-bold text-slate-900">{unpaidCommitments.length}</p>
        </div>
      </div>

      {/* Unpaid Commitments - Always Visible */}
      <div className="mb-3">
        <p className="text-[10px] md:text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Upcoming ({unpaidCommitments.length})
        </p>
        {unpaidCommitments.length === 0 ? (
          <div className="text-xs text-emerald-500 p-2 md:p-3 bg-emerald-50 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> All commitments paid! 🎉
          </div>
        ) : (
          <div className="space-y-1.5">
            {unpaidCommitments.slice(0, 3).map(comm => {
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
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sm font-bold whitespace-nowrap text-slate-800">
                      {formatMYR(comm.amount)}
                    </span>
                    {onMarkAsPaid && (
                      <button 
                        onClick={() => onMarkAsPaid(comm.id)}
                        className="p-1.5 text-emerald-500 hover:text-emerald-700 rounded transition-colors"
                        title="Mark as paid"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {unpaidCommitments.length > 3 && (
              <p className="text-xs text-slate-400 text-center pt-1">
                +{unpaidCommitments.length - 3} more commitments
              </p>
            )}
          </div>
        )}
      </div>

      {/* Paid Commitments - Collapsible */}
      {hasPaid && (
        <div className="mb-2">
          <button
            onClick={() => setShowPaid(!showPaid)}
            className="w-full flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="text-[10px] md:text-xs text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" /> Paid ({paidCommitments.length})
            </span>
            {showPaid ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          
          {showPaid && (
            <div className="mt-2 space-y-1">
              {paidCommitments.map(comm => (
                <div key={comm.id} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm text-slate-500 line-through truncate">{comm.name}</span>
                  </div>
                  <span className="text-sm text-slate-400 line-through shrink-0">{formatMYR(comm.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inactive Commitments - Collapsible */}
      {hasInactive && (
        <div className="mb-2">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="w-full flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="text-[10px] md:text-xs text-slate-400 uppercase font-bold tracking-wider">
              Inactive ({inactiveCommitments.length})
            </span>
            {showInactive ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          
          {showInactive && (
            <div className="mt-2 space-y-1">
              {inactiveCommitments.slice(0, 3).map(comm => (
                <div key={comm.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-100">
                  <span className="text-xs text-slate-400 line-through truncate">{comm.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sm text-slate-400 line-through">{formatMYR(comm.amount)}</span>
                    <button 
                      onClick={() => onToggleCommitment(comm.id, comm.is_active)}
                      className="p-1.5 text-slate-300 hover:text-emerald-500 rounded transition-colors"
                      title="Activate"
                    >
                      <CheckCircle className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {inactiveCommitments.length > 3 && (
                <p className="text-xs text-slate-400 text-center pt-1">
                  +{inactiveCommitments.length - 3} more
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Warning - Only show if critical */}
      {!isSafe && totalRequired > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-2">
          <p className="text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Shortfall:</strong> {formatMYR(shortfall)} needed for upcoming commitments
            </span>
          </p>
        </div>
      )}

      {/* Summary - Simplified */}
      {commitments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] md:text-xs text-slate-400 flex items-center gap-3">
            <span>{activeCommitments.length} active</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className="text-emerald-500">{paidCommitments.length} paid</span>
            {unpaidCommitments.length > 0 && (
              <>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="text-amber-500">{unpaidCommitments.length} unpaid</span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}