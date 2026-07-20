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
    if (!hasSpendingData) return 'text-slate-500 border-slate-200 bg-slate-50'
    if (!isSafe) return 'text-red-600 border-red-200 bg-red-50'
    if (isOverspending) return 'text-amber-600 border-amber-200 bg-amber-50'
    return 'text-emerald-600 border-emerald-200 bg-emerald-50'
  }

  const getStatusIcon = () => {
    if (!hasSpendingData) return <Coffee className="w-4 h-4" />
    if (!isSafe) return <TrendingDown className="w-4 h-4" />
    if (isOverspending) return <AlertCircle className="w-4 h-4" />
    return <TrendingUp className="w-4 h-4" />
  }

  const getStatusText = () => {
    if (!hasSpendingData) return 'No spending yet'
    if (!isSafe) return `⚠️ ${projectedRunwayDays}d left`
    if (isOverspending) return `⚠️ ${formatMYR(overspendAmount)}/day over`
    return `✅ On track`
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
    <div className={`bg-white rounded-2xl shadow-sm border p-4 md:p-6 relative overflow-hidden transition-all duration-300 ${
      hasSpendingData ? (isSafe ? 'border-slate-100' : 'border-red-200') : 'border-slate-200'
    }`}>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" /> {name} Burn Rate
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Daily spending & runway</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 border ${getStatusColor()}`}>
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
      </div>

      {/* Key Stats - 3 columns */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
        <div className="bg-slate-50 p-2.5 md:p-3 rounded-xl border border-slate-100 text-center">
          <p className="text-[10px] md:text-xs text-slate-400 uppercase font-bold tracking-wider">Balance</p>
          <p className={`text-sm md:text-base font-bold ${currentBalance < 100 ? 'text-red-500' : 'text-slate-900'}`}>
            {formatMYR(currentBalance)}
          </p>
        </div>
        <div className="bg-slate-50 p-2.5 md:p-3 rounded-xl border border-slate-100 text-center">
          <p className="text-[10px] md:text-xs text-slate-400 uppercase font-bold tracking-wider">Daily Avg</p>
          <p className="text-sm md:text-base font-bold text-slate-900">
            {hasSpendingData ? formatMYR(averageDailySpend) : '—'}
          </p>
        </div>
        <div className="bg-slate-50 p-2.5 md:p-3 rounded-xl border border-slate-100 text-center">
          <p className="text-[10px] md:text-xs text-slate-400 uppercase font-bold tracking-wider">Runway</p>
          <p className={`text-sm md:text-base font-bold ${!hasSpendingData ? 'text-slate-400' : projectedRunwayDays < 7 ? 'text-red-500' : 'text-slate-900'}`}>
            {isInfiniteRunway ? '∞' : `${projectedRunwayDays}d`}
          </p>
        </div>
      </div>

      {/* Progress Bar - Runway vs Month */}
      {hasSpendingData && (
        <div className="mb-3 md:mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Runway vs Month
            </span>
            <span className="font-medium text-slate-700">
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

      {/* Month Progress */}
      <div className="mb-3 md:mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Month Progress
          </span>
          <span className="font-medium text-slate-700">{daysPassed}/30d</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div 
            className="h-full rounded-full bg-blue-400 transition-all duration-1000"
            style={{ width: `${monthProgress}%` }}
          />
        </div>
      </div>

      {/* No Spending Data Message */}
      {!hasSpendingData && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
              <Coffee className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">No spending data yet</p>
              <p className="text-xs text-slate-400">Start logging transactions</p>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Details Button */}
      {hasSpendingData && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          {showDetails ? 'Hide details' : 'Show details'}
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      )}

      {/* Details - Expandable */}
      {hasSpendingData && showDetails && (
        <div className="mt-3 space-y-3">
          {/* Daily Budget Comparison */}
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <div className="bg-slate-50 p-2 md:p-2.5 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Daily Budget</p>
              <p className="text-sm md:text-base font-bold text-slate-800">
                {dailyBudget > 0 ? formatMYR(dailyBudget) : '—'}
              </p>
            </div>
            <div className="bg-slate-50 p-2 md:p-2.5 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Daily Spend</p>
              <p className={`text-sm md:text-base font-bold ${isOverspending ? 'text-red-500' : 'text-emerald-500'}`}>
                {formatMYR(averageDailySpend)}
              </p>
            </div>
          </div>

          {/* Projected End Balance */}
          <div className="bg-slate-50 p-3 md:p-3 rounded-xl border border-slate-100">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Projected End Balance</p>
                <p className={`text-base md:text-lg font-bold ${projectedEndBalance < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                  {formatMYR(projectedEndBalance)}
                </p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                projectedEndBalance < 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {projectedEndBalance < 0 ? '⚠️ Deficit' : '✅ Surplus'}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Based on {formatMYR(averageDailySpend)}/day
            </p>
          </div>

          {/* Alerts */}
          {!isSafe && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Running out!</strong> Only {projectedRunwayDays} days remaining
                  {overspendAmount > 0 && ` (overspending ${formatMYR(overspendAmount)}/day)`}
                </span>
              </p>
              <p className="text-xs text-red-600 mt-1 ml-6">
                💡 Try to stay under {formatMYR(dailyBudget)}/day
              </p>
            </div>
          )}

          {isSafe && isOverspending && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Overspending!</strong> {formatMYR(overspendAmount)}/day over budget
                </span>
              </p>
              <p className="text-xs text-amber-600 mt-1 ml-6">
                💡 Try to stay under {formatMYR(dailyBudget)}/day
              </p>
            </div>
          )}

          {isSafe && !isOverspending && averageDailySpend > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs text-emerald-700 flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>On track!</strong> Spending {formatMYR(averageDailySpend)}/day
                </span>
              </p>
              <p className="text-xs text-emerald-600 mt-1 ml-6">
                💡 You'll have {formatMYR(projectedEndBalance)} left
              </p>
            </div>
          )}

          {/* Spending Trend */}
          {spendingTrend !== undefined && Math.abs(spendingTrend) > 5 && (
            <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-100 pt-2">
              <Clock className="w-3 h-3" />
              <span>
                {spendingTrend > 0 ? (
                  <>📈 <span className="text-red-500 font-medium">{spendingTrend.toFixed(0)}%</span> higher than last month</>
                ) : (
                  <>📉 <span className="text-emerald-500 font-medium">{Math.abs(spendingTrend).toFixed(0)}%</span> lower than last month</>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}