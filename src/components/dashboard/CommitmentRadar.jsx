// src/components/dashboard/CommitmentRadar.jsx
import { useState } from 'react'
import { Target, ShieldCheck, AlertTriangle, Calendar, Plus, Check, CheckCircle, ChevronDown, ChevronUp, Power, Trash2, Building2 } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

export const CommitmentRadar = ({ 
  radarStats, 
  commitments = [],
  accounts = [],
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
    shortfall = 0
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

  const getAccountName = (id) => {
    const acc = accounts.find(a => a.id === id)
    return acc ? acc.account_name : 'Unknown Account'
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
      <div className="flex justify-between items-center mb-5 mt-1">
        <p className="text-xs font-medium text-slate-400">Track your subscriptions & bills</p>
        
        <div className="flex items-center gap-1.5">
          {onAddCommitment && (
            <button 
              onClick={onAddCommitment}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200"
              title="Add commitment"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider flex items-center gap-1.5 border shadow-sm ${
            isSafe ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {isSafe ? <ShieldCheck className="w-3.5 h-3.5"/> : <AlertTriangle className="w-3.5 h-3.5"/>}
            {isSafe ? 'SAFE' : 'ALERT'}
          </div>
        </div>
      </div>

      {/* Quick Status Info-Deck */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total Liquidity</p>
          <p className="text-sm font-black text-slate-800">{formatMYR(currentBalance)}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Required</p>
          <p className="text-sm font-black text-slate-800">{formatMYR(totalRequired)}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Due Items</p>
          <p className={`text-sm font-black ${unpaidCommitments.length > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {unpaidCommitments.length}
          </p>
        </div>
      </div>

      {/* Unpaid Commitments Section */}
      <div className="mb-4">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2.5 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-500" /> Upcoming Tasks ({unpaidCommitments.length})
        </p>
        {unpaidCommitments.length === 0 ? (
          <div className="text-xs font-medium text-emerald-700 p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-500" /> All commitments paid for this month!
          </div>
        ) : (
          <div className="space-y-2">
            {unpaidCommitments.map(comm => {
              const status = getCommitmentStatus(comm.due_day_of_month)
              const isOverdue = getDaysUntil(comm.due_day_of_month) < 0
              
              return (
                <div key={comm.id} className={`group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl transition-all duration-200 border shadow-sm ${
                  isOverdue ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-100 hover:border-slate-200'
                }`}>
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1 mb-2 sm:mb-0">
                    <div className="flex items-center gap-2">
                      {isOverdue ? (
                        <div className="bg-red-100 p-1 rounded-md text-red-600 shrink-0">
                          <AlertTriangle className="w-3 h-3 animate-pulse" />
                        </div>
                      ) : (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap uppercase tracking-wider ${status.color}`}>
                          {status.label}
                        </span>
                      )}
                      <span className="text-sm font-bold text-slate-800 truncate">
                        {comm.name}
                      </span>
                    </div>
                    {/* Account Indicator Badge */}
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      Deducts from: <span className="font-bold text-slate-700">{getAccountName(comm.account_id)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0 mt-1 sm:mt-0">
                    <span className="text-sm font-black whitespace-nowrap text-slate-800">
                      {formatMYR(comm.amount)}
                    </span>
                    {onMarkAsPaid && (
                      <button 
                        onClick={() => {
                          if (window.confirm(`Mark ${comm.name} as paid? This will automatically log a ${formatMYR(comm.amount)} expense from ${getAccountName(comm.account_id)}.`)) {
                            onMarkAsPaid(comm.id)
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" /> Pay Now
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
            className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors shadow-sm group"
          >
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Fully Paid ({paidCommitments.length})
            </span>
            {showPaid ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />}
          </button>
          
          <div className={`grid transition-all duration-300 ease-in-out ${showPaid ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden space-y-1.5">
              {paidCommitments.map(comm => (
                <div key={comm.id} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/30 border border-emerald-100/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-500 line-through truncate">{comm.name}</span>
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
            className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors shadow-sm group"
          >
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Power className="w-3.5 h-3.5 text-slate-400" /> Inactive Archives ({inactiveCommitments.length})
            </span>
            {showInactive ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />}
          </button>
          
          <div className={`grid transition-all duration-300 ease-in-out ${showInactive ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden space-y-1.5">
              {inactiveCommitments.map(comm => (
                <div key={comm.id} className="group flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-all">
                  <span className="text-xs font-bold text-slate-500 truncate">{comm.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-400 mr-2">{formatMYR(comm.amount)}</span>
                    <button 
                      onClick={() => onToggleCommitment(comm.id, comm.is_active)}
                      className="flex items-center justify-center p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all border border-transparent hover:border-emerald-200"
                      title="Reactivate"
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    {onDeleteCommitment && (
                      <button 
                        onClick={() => onDeleteCommitment(comm.id)}
                        className="flex items-center justify-center p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all border border-transparent hover:border-red-200"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
        <div className="bg-red-50/60 border border-red-200/60 rounded-xl p-3.5 mt-4 animate-fadeIn flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-800">Liquidity Shortfall Detected</p>
            <p className="text-xs text-red-700/90 mt-0.5 leading-relaxed">
              Your total available balance across all accounts is short by <span className="font-bold">{formatMYR(shortfall)}</span> to cover upcoming commitments securely.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}