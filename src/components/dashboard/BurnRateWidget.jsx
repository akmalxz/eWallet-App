// src/components/dashboard/BurnRateWidget.jsx
import { useState } from 'react'
import { Flame, TrendingUp, TrendingDown, AlertCircle, Calendar, Clock, Zap, Check, Coffee, ChevronDown, ChevronUp } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

export const BurnRateWidget = ({ velocityStats }) => {
  const [showDetails, setShowDetails] = useState(false)

  const {
    currentBalance = 0,
    totalSpentThisMonth = 0,
    averageDailySpend = 0,
    projectedRunwayDays = 999,
    daysRemaining = 30,
    isSafe = true,
    name = 'Digital Bank',
    dailyBudget = 0,
    daysPassed = 0,
    projectedEndBalance = 0,
    overspendAmount = 0,
    spendingTrend = 0
  } = velocityStats || {}

  const monthProgress = Math.min(100, (daysPassed / 30) * 100)
  const isOverspending = averageDailySpend > dailyBudget && dailyBudget > 0
  const hasSpendingData = totalSpentThisMonth > 0 && averageDailySpend > 0
  const isInfiniteRunway = !hasSpendingData || projectedRunwayDays === 999 || projectedRunwayDays > 365

  const getStatusColor = () => {
    if (!hasSpendingData) return 'text-slate-600 border-slate-200 bg-slate-50'
    if (!isSafe) return 'text-red-700 border-red-200 bg-red-50'
    if (isOverspending) return 'text-amber-700 border-amber-200 bg-amber-50'
    return 'text-emerald-700 border-emerald-200 bg-emerald-50'
  }

  const getStatusIcon = () => {
    if (!hasSpendingData) return <Coffee className="w-3.5 h-3.5" />
    if (!isSafe) return <TrendingDown className="w-3.5 h-3.5" />
    if (isOverspending) return <AlertCircle className="w-3.5 h-3.5" />
    return <TrendingUp className="w-3.5 h-3.5" />
  }

  const getStatusText = () => {
    if (!hasSpendingData) return 'No spending yet'
    if (!isSafe) return `${projectedRunwayDays}d left`
    if (isOverspending) return `${formatMYR(overspendAmount)}/day over`
    return 'On track'
  }

  const getRunwayColor = () => {
    if (!isSafe) return 'bg-red-500'
    if (projectedRunwayDays < daysRemaining * 0.5) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const runwayPercentage = hasSpendingData 
    ? Math.min(100, (projectedRunwayDays / Math.max(1, daysRemaining)) * 100)
    : 0

  return (
    <div className={`bg-white rounded-2xl shadow-md border p-5 md:p-6 relative overflow-hidden transition-all duration-300 ${
      hasSpendingData ? (isSafe ? 'border-slate-100 shadow-slate-100/40' : 'border-red-100 shadow-red-50/30') : 'border-slate-200'
    }`}>
      {/* Top Accent Strip */}
      <div className={`absolute top-0 inset-x-0 h-1 ${!hasSpendingData ? 'bg-slate-300' : isSafe ? 'bg-emerald-500' : 'bg-red-500'}`} />

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500 animate-pulse" /> {name} Burn Rate
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Daily spending & runway</p>
        </div>
        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider flex items-center gap-1 border ${getStatusColor()}`}>
          <div className="flex items-center justify-center shrink-0">{getStatusIcon()}</div>
          <span className="uppercase">{getStatusText()}</span>
        </div>
      </div>

      {/* Primary Info Deck Dashboard Grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-100/80 text-center">
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Balance</p>
          <p className={`text-sm font-black ${currentBalance < 100 ? 'text-red-500' : 'text-slate-800'}`}>
            {formatMYR(currentBalance)}
          </p>
        </div>
        <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-100/80 text-center">
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Daily Avg</p>
          <p className="text-sm font-black text-slate-800">
            {hasSpendingData ? formatMYR(averageDailySpend) : '—'}
          </p>
        </div>
        <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-100/80 text-center">
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Runway</p>
          <p className={`text-sm font-black ${!hasSpendingData ? 'text-slate-400' : projectedRunwayDays < 7 ? 'text-red-500' : 'text-slate-800'}`}>
            {isInfiniteRunway ? '∞' : `${projectedRunwayDays}d`}
          </p>
        </div>
      </div>

      {/* Progress Metric Bars */}
      <div className="space-y-3.5 mb-2">
        {hasSpendingData && (
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Runway vs Month
              </span>
              <span className="font-bold text-slate-700 text-xs">
                {isInfiniteRunway ? '∞' : `${projectedRunwayDays}d`} / {daysRemaining}d
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${getRunwayColor()}`}
                style={{ width: `${Math.min(100, runwayPercentage)}%` }}
              />
            </div>
          </div>
        )}

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> Month Timeline
            </span>
            <span className="font-bold text-slate-700 text-xs">{daysPassed}/30 days</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full rounded-full bg-blue-500 transition-all duration-1000"
              style={{ width: `${monthProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Fallback Empty State Indicator */}
      {!hasSpendingData && (
        <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-4 mt-4 animate-fadeIn flex items-center gap-3.5">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0 border border-slate-200/50">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">No Spending Logged</p>
            <p className="text-xs text-slate-400 mt-0.5">Data updates automatically upon logging transactions.</p>
          </div>
        </div>
      )}

      {/* Toggle Action Control Panel Button */}
      {hasSpendingData && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-slate-100/80 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors group"
        >
          <span>{showDetails ? 'Hide Analytical Metrics' : 'Expand Analytical Metrics'}</span>
          <div className="flex items-center justify-center shrink-0">
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>
      )}

      {/* Expandable Info Area */}
      {hasSpendingData && (
        <div className={`grid transition-all duration-300 ease-in-out ${showDetails ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden space-y-4">
            
            {/* Daily Threshold Configurations Comparison Deck */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-100/80">
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Daily Target Budget</p>
                <p className="text-sm font-black text-slate-700">
                  {dailyBudget > 0 ? formatMYR(dailyBudget) : '—'}
                </p>
              </div>
              <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-100/80">
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Realized Daily Spend</p>
                <p className={`text-sm font-black ${isOverspending ? 'text-red-500' : 'text-emerald-500'}`}>
                  {formatMYR(averageDailySpend)}
                </p>
              </div>
            </div>

            {/* Projected End Balance Panel */}
            <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100/80 flex justify-between items-center gap-4">
              <div>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Projected EOM Balance</p>
                <p className={`text-base font-black ${projectedEndBalance < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                  {formatMYR(projectedEndBalance)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Calculated at {formatMYR(averageDailySpend)}/day velocity
                </p>
              </div>
              <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider shrink-0 border ${
                projectedEndBalance < 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {projectedEndBalance < 0 ? 'DEFICIT ALERT' : 'SURPLUS CLEAR'}
              </div>
            </div>

            {/* Context Alert Cards */}
            {!isSafe && (
              <div className="bg-red-50/60 border border-red-200/60 rounded-xl p-3.5 flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-800">Critical Runway Risk</p>
                  <p className="text-xs text-red-700/90 mt-0.5 leading-relaxed">
                    Balance will exhaust in <span className="font-bold">{projectedRunwayDays} days</span>. 
                    {overspendAmount > 0 && ` You are currently exceeding your target allocation thresholds by ${formatMYR(overspendAmount)} every single day.`}
                  </p>
                  <p className="text-xs font-semibold text-red-600 mt-1.5">
                    💡 Adjustment: Target staying below {formatMYR(dailyBudget)}/day to stabilize runway.
                  </p>
                </div>
              </div>
            )}

            {isSafe && isOverspending && (
              <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3.5 flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-800">Exceeding Budget Speed</p>
                  <p className="text-xs text-amber-700/90 mt-0.5 leading-relaxed">
                    Your runway is stable, but your daily burn speed exceeds targets by <span className="font-bold">{formatMYR(overspendAmount)}/day</span>.
                  </p>
                  <p className="text-xs font-semibold text-amber-600 mt-1.5">
                    💡 Adjustment: Restrict core dynamic expenses to fall under {formatMYR(dailyBudget)}/day.
                  </p>
                </div>
              </div>
            )}

            {isSafe && !isOverspending && averageDailySpend > 0 && (
              <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-3.5 flex items-start gap-2.5 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">Optimal Spending Pattern</p>
                  <p className="text-xs text-emerald-700/90 mt-0.5 leading-relaxed">
                    Excellent balance management! You are pacing well inside your designated daily targets at <span className="font-bold">{formatMYR(averageDailySpend)}/day</span>.
                  </p>
                  <p className="text-xs font-semibold text-emerald-600 mt-1.5">
                    💡 Outcome: Projected to finish the current billing cycle with {formatMYR(projectedEndBalance)} clear surplus.
                  </p>
                </div>
              </div>
            )}

            {/* Historical Spending Trend Line Footer */}
            {spendingTrend !== undefined && Math.abs(spendingTrend) > 5 && (
              <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-100/80 pt-3">
                <div className="flex items-center justify-center shrink-0"><Clock className="w-3.5 h-3.5 text-slate-400" /></div>
                <span className="text-[11px] font-medium">
                  {spendingTrend > 0 ? (
                    <>Velocity is <span className="text-red-600 font-bold">↑ {spendingTrend.toFixed(0)}% higher</span> than the prior monthly cycle baseline.</>
                  ) : (
                    <>Velocity is <span className="text-emerald-600 font-bold">↓ {Math.abs(spendingTrend).toFixed(0)}% lower</span> than the prior monthly cycle baseline.</>
                  )}
                </span>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  )
}