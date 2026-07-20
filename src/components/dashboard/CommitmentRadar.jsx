// src/components/dashboard/CommitmentRadar.jsx
import { useState } from 'react'
import { Target, ShieldCheck, AlertTriangle, Calendar, Plus, Check, CheckCircle, ChevronDown, ChevronUp, Power, Trash2 } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

export const CommitmentRadar = ({ 
  radarStats, 
  commitments = [], 
  onAddCommitment, 
  onDeleteCommitment,
  onToggleCommitment,
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
    if (daysUntil === 0) return { label: 'Due today!', color: 'text-red-600 bg-red-50 border border-red-200' }
    if (daysUntil <= 3) return { label: `${daysUntil}d left`, color: 'text-amber-700 bg-amber-50 border border-amber-200' }
    if (daysUntil <= 7) return { label: `${daysUntil}d left`, color: 'text-blue-700 bg-blue-50 border border-blue-200' }
    return { label: `Day ${dueDay}`, color: 'text-slate-500 bg-slate-50 border border-slate-200' }
  }

  const sortedCommitments = [...commitments].sort((a, b) => a.due_day_of_month - b.due_day_of_month)
  const activeCommitments = sortedCommitments.filter(c => c.is_active)
  const inactiveCommitments = sortedCommitments.filter(c => !c.is_active)
  const unpaidCommitments = activeCommitments.filter(c => c.last_paid_month !== currentMonth)
  const paidCommitments = activeCommitments.filter(c => c.last_paid_month === currentMonth)

  return (
    <div className={`bg-white rounded-2xl shadow-md border p-5 md:p-6 relative overflow-hidden transition-all duration-300 ${
      isSafe ? 'border-slate-100 shadow-slate-100/40' : 'border-red-100 shadow-red-50/30'
    }`}>
      
      {/* Dynamic Status Glow Strip */}
      <div className={`absolute top-0 inset-x-0 h-1 ${isSafe ? 'bg-emerald-500' : 'bg-red-500'}`} />

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
             Commitment Tracker
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Track your subscriptions & bills</p>
        </div>
        <div className="flex items-center gap-1.5">
          {onAddCommitment && (
            <button 
              onClick={onAddCommitment}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all"
              title="Add commitment"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider flex items-center gap-1 ${
            isSafe ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {isSafe ? <ShieldCheck className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
            {isSafe ? 'SAFE' : 'ALERT'}
          </div>
        </div>
      </div>

      {/* Quick Status Info-Deck */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-50/60 p-2.5 rounded-xl text-center border border-slate-100/80">
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Available</p>
          <p className="text-sm font-black text-slate-800">{formatMYR(currentBalance)}</p>
        </div>
        <div className="bg-slate-50/60 p-2.5 rounded-xl text-center border border-slate-100/80">
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Required</p>
          <p className="text-sm font-black text-slate-800">{formatMYR(totalRequired)}</p>
        </div>
        <div className="bg-slate-50/60 p-2.5 rounded-xl text-center border border-slate-100/80">
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Due Items</p>
          <p className={`text-sm font-black ${unpaidCommitments.length > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {unpaidCommitments.length}
          </p>
        </div>
      </div>

      {/* Unpaid Commitments Section */}
      <div className="mb-4">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2.5 flex items-center gap-1.5">
          <Calendar className="w-3 h-3" /> Upcoming Tasks ({unpaidCommitments.length})
        </p>
        {unpaidCommitments.length === 0 ? (
          <div className="text-xs font-medium text-emerald-700 p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-500" /> All commitments paid! 🎉
          </div>
        ) : (
          <div className="space-y-2">
            {unpaidCommitments.map(comm => {
              const status = getCommitmentStatus(comm.due_day_of_month)
              const isOverdue = getDaysUntil(comm.due_day_of_month) < 0
              
              return (
                <div key={comm.id} className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 border ${
                  isOverdue ? 'bg-red-50/50 border-red-200' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {isOverdue ? (
                      <div className="bg-red-100 p-1 rounded-md text-red-600 shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                      </div>
                    ) : (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${status.color}`}>
                        {status.label}
                      </span>
                    )}
                    <span className="text-sm font-semibold truncate text-slate-700">
                      {comm.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold whitespace-nowrap text-slate-800">
                      {formatMYR(comm.amount)}
                    </span>
                    {onMarkAsPaid && (
                      <button 
                        onClick={() => onMarkAsPaid(comm.id)}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-lg transition-all"
                        title="Mark as paid"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Paid Commitments Collapsible Panel */}
      {paidCommitments.length > 0 && (
        <div className="mb-2">
          <button
            onClick={() => setShowPaid(!showPaid)}
            className="w-full flex items-center justify-between p-2.5 bg-slate-50/60 hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors group"
          >
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Fully Paid ({paidCommitments.length})
            </span>
            {showPaid ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />}
          </button>
          
          <div className={`grid transition-all duration-300 ease-in-out ${showPaid ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden space-y-1.5">
              {paidCommitments.map(comm => (
                <div key={comm.id} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/20 border border-emerald-100/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-400 line-through truncate">{comm.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 line-through shrink-0">{formatMYR(comm.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inactive Commitments Collapsible Panel */}
      {inactiveCommitments.length > 0 && (
        <div className="mb-2">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="w-full flex items-center justify-between p-2.5 bg-slate-50/60 hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors group"
          >
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Power className="w-3.5 h-3.5 text-slate-400" /> Inactive Archives ({inactiveCommitments.length})
            </span>
            {showInactive ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />}
          </button>
          
          <div className={`grid transition-all duration-300 ease-in-out ${showInactive ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden space-y-1.5">
              {inactiveCommitments.map(comm => (
                <div key={comm.id} className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-50/30 border border-slate-100/70 hover:border-slate-200 transition-all">
                  <span className="text-xs font-medium text-slate-400 truncate">{comm.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-slate-400 mr-1">{formatMYR(comm.amount)}</span>
                    <button 
                      onClick={() => onToggleCommitment(comm.id, comm.is_active)}
                      className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                      title="Reactivate"
                    >
                      <Power className="w-3 h-3" />
                    </button>
                    {onDeleteCommitment && (
                      <button 
                        onClick={() => onDeleteCommitment(comm.id)}
                        className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
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
        </div>
      )}

      {/* Warning Notification Drawer */}
      {!isSafe && totalRequired > 0 && (
        <div className="bg-red-50/60 border border-red-200/60 rounded-xl p-3.5 mt-3 animate-fadeIn flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-800">Shortfall Detected</p>
            <p className="text-xs text-red-700/90 mt-0.5 leading-relaxed">
              You need an additional <span className="font-bold">{formatMYR(shortfall)}</span> in this account to cover upcoming commitments securely.
            </p>
          </div>
        </div>
      )}

      {/* Footer Metrics Log Summary */}
      {commitments.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-3">
            <span>{activeCommitments.length} Active Node Items</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className="text-emerald-600 font-bold">{paidCommitments.length} Cleared</span>
            {unpaidCommitments.length > 0 && (
              <>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="text-amber-600 font-bold">{unpaidCommitments.length} Pending</span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}