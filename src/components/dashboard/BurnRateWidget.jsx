// src/components/dashboard/BurnRateWidget.jsx
import { useState, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, AlertCircle, ChevronDown, ChevronUp,
  Coffee, Check, Info, ArrowRight
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { COLORS } from '../../utils/analyticsColors'

const RUNWAY_CRITICAL_DAYS = 7
const AMBER_NEAR_MONTH_END = 5

const compactMYR = (n) => {
  const abs = Math.abs(n)
  if (abs >= 1000000) return `RM ${(n / 1000000).toFixed(1)}M`
  if (abs >= 1000) return `RM ${(n / 1000).toFixed(1)}k`
  return formatMYR(n)
}

const formatDate = (d) =>
  d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })

export const BurnRateWidget = ({ velocityStats, onSeeTrends }) => {
  const [showDetails, setShowDetails] = useState(() => {
    try { return localStorage.getItem('burnRateExpanded') === 'true' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem('burnRateExpanded', String(showDetails)) } catch {}
  }, [showDetails])

  const {
    currentBalance = 0,
    totalSpentThisMonth = 0,
    averageDailySpend = 0,
    projectedRunwayDays = 999,
    daysRemaining = 0,
    daysPassed = 0,
    monthLength = 30,
    isSafe = true,
    dailyBudget = 0,
    spendingTrend = 0,
    isEarlyMonth = false,
    projectedRunoutDate = null,
    runoutBeforeMonthEnd = false,
    accountLabel = 'Account'
  } = velocityStats || {}

  const hasSpendingData = totalSpentThisMonth > 0 && averageDailySpend > 0
  const isInfiniteRunway = !hasSpendingData || projectedRunwayDays > 365

  const balanceCoversUnder7Days =
    averageDailySpend > 0 && currentBalance / averageDailySpend < RUNWAY_CRITICAL_DAYS

  const getStatus = () => {
    if (!hasSpendingData) return { label: '', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: Coffee }
    if (!isSafe) return { label: 'At risk', color: 'bg-red-50 text-red-700 border-red-200', icon: TrendingDown }
    if (averageDailySpend > dailyBudget && dailyBudget > 0) {
      return { label: 'Over pace', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertCircle }
    }
    return { label: 'On track', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: TrendingUp }
  }
  const status = getStatus()
  const StatusIcon = status.icon

  const dayPercent = (daysPassed / monthLength) * 100
  const runoutPercent = runoutBeforeMonthEnd
    ? (Math.min(daysPassed + projectedRunwayDays, monthLength) / monthLength) * 100
    : null

  const markerColor = (() => {
    if (!runoutBeforeMonthEnd) return COLORS.down
    const nearEnd = (monthLength - (daysPassed + projectedRunwayDays)) <= AMBER_NEAR_MONTH_END
    if (nearEnd) return '#f59e0b'
    return COLORS.up
  })()

  const advice = (() => {
    if (!hasSpendingData) return null
    if (!isSafe) return { type: 'risk', title: 'Runway risk', body: `At this pace, your balance runs out in ${projectedRunwayDays} days.`, action: `Keep daily spend under ${formatMYR(dailyBudget)} to last the month.` }
    if (averageDailySpend > dailyBudget && dailyBudget > 0) return { type: 'over', title: 'Over safe pace', body: `You're spending ${formatMYR(averageDailySpend - dailyBudget)}/day above your safe pace.`, action: `Try to stay under ${formatMYR(dailyBudget)}/day.` }
    return { type: 'good', title: 'On track', body: `Your pace is sustainable at ${formatMYR(averageDailySpend)}/day.`, action: 'Keep it up.' }
  })()

  return (
    <div className="relative flex flex-col h-full">

      {/* Accent strip for this panel */}
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-full ${
        !hasSpendingData
          ? 'bg-slate-200'
          : isSafe
            ? 'bg-emerald-500'
            : 'bg-red-500'
      }`} />

      {/* Header */}
      <div className="flex justify-between items-start mb-4 gap-3 pt-4">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800">Burn Rate</h2>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{accountLabel}</p>
        </div>
        {status.label && (
          <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider flex items-center gap-1.5 border shadow-sm ${status.color} shrink-0`}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span className="uppercase">{status.label}</span>
          </div>
        )}
      </div>

      {/* Three top numbers */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
          <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">Balance</p>
          <p className={`text-sm font-black truncate ${balanceCoversUnder7Days ? 'text-red-600' : 'text-slate-800'}`} title={formatMYR(currentBalance)}>
            {compactMYR(currentBalance)}
          </p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
          <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">Daily avg</p>
          <p className="text-sm font-black text-slate-800 truncate" title={formatMYR(averageDailySpend)}>
            {hasSpendingData ? compactMYR(averageDailySpend) : '—'}
          </p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
          <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">Runway</p>
          <p className={`text-sm font-black ${!hasSpendingData ? 'text-slate-400' : projectedRunwayDays < RUNWAY_CRITICAL_DAYS ? 'text-red-600' : 'text-slate-800'}`}>
            {isInfiniteRunway ? '∞' : `${projectedRunwayDays}d`}
          </p>
        </div>
      </div>

      {/* Spending trend line */}
      {hasSpendingData && Math.abs(spendingTrend) > 5 && (
        <div className="flex items-center gap-2 text-xs mb-4 px-1">
          <div className={`flex items-center justify-center shrink-0 ${spendingTrend > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {spendingTrend > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          </div>
          <span className="text-slate-500 font-medium">
            Spending is{' '}
            <span className={`font-bold ${spendingTrend > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {Math.abs(spendingTrend).toFixed(0)}% {spendingTrend > 0 ? 'higher' : 'lower'}
            </span>{' '}
            than last month.
          </span>
        </div>
      )}

      {/* Runway timeline */}
      {hasSpendingData ? (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] mb-2">
            <span className="text-slate-500 font-semibold">Days passed</span>
            <span className="text-slate-700 font-bold">{daysPassed} / {monthLength} days</span>
          </div>

          <div className="relative w-full bg-slate-100 rounded-full h-3 overflow-visible">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-1000"
              style={{ width: `${dayPercent}%` }}
            />
            {runoutPercent !== null && (
              <div
                className="absolute -top-1 w-1 h-5 rounded-full shadow-md transition-all duration-1000"
                style={{ left: `calc(${runoutPercent}% - 2px)`, backgroundColor: markerColor }}
                aria-label={`Projected runout at day ${daysPassed + projectedRunwayDays}`}
                title={projectedRunoutDate ? `Projected runout ${formatDate(projectedRunoutDate)}` : ''}
              />
            )}
          </div>

          {projectedRunoutDate && runoutBeforeMonthEnd && (
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              At this pace, your balance runs out on{' '}
              <strong className="text-slate-700">{formatDate(projectedRunoutDate)}</strong>,
              {' '}{monthLength - (daysPassed + projectedRunwayDays)} days before month end.
            </p>
          )}
          {hasSpendingData && !runoutBeforeMonthEnd && (
            <p className="text-xs text-emerald-600 mt-3 leading-relaxed font-medium">
              Your balance lasts beyond this month. 🎉
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 bg-white/50 border-2 border-slate-200 border-dashed rounded-2xl mt-2">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
            <Coffee className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">No spending yet</p>
          <p className="text-xs text-slate-400 mt-1 text-center max-w-[220px] leading-relaxed">
            {isEarlyMonth ? 'Come back in a day or two to see your burn rate.' : 'Log an expense to start tracking.'}
          </p>
        </div>
      )}

      {/* Expand toggle */}
      {hasSpendingData && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          style={{ minHeight: 44 }}
          aria-expanded={showDetails}
        >
          <span>{showDetails ? 'Fewer details' : 'More details'}</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Expanded panel */}
      {hasSpendingData && (
        <div className={`grid transition-all duration-300 ease-in-out ${showDetails ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden space-y-3">

            <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Safe daily spend</p>
                <Info className="w-3 h-3 text-slate-300" title="Your balance divided by the days left in this month." />
              </div>
              <p className="text-sm font-black text-slate-700">
                {dailyBudget > 0 ? formatMYR(dailyBudget) : '—'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Suggested from your balance and days left in the month.
              </p>
            </div>

            <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Your daily average</p>
              <p className={`text-sm font-black mt-1 ${averageDailySpend > dailyBudget && dailyBudget > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {formatMYR(averageDailySpend)}
              </p>
            </div>

            {(() => {
              const projectedEnd = currentBalance - averageDailySpend * daysRemaining
              return (
                <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Expected month-end balance</p>
                    <p className={`text-base font-black mt-0.5 ${projectedEnd < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                      {formatMYR(projectedEnd)}
                    </p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider shrink-0 border ${
                    projectedEnd < 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {projectedEnd < 0 ? 'Overspending' : 'On track'}
                  </div>
                </div>
              )
            })()}

            {advice && (
              <div className={`rounded-xl p-3.5 flex items-start gap-2.5 border ${
                advice.type === 'risk' ? 'bg-red-50/60 border-red-200/60'
                : advice.type === 'over' ? 'bg-amber-50/60 border-amber-200/60'
                : 'bg-emerald-50/60 border-emerald-200/60'
              }`}>
                {advice.type === 'good'
                  ? <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  : <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${advice.type === 'risk' ? 'text-red-600' : 'text-amber-600'}`} />
                }
                <div>
                  <p className={`text-xs font-bold ${
                    advice.type === 'risk' ? 'text-red-800'
                    : advice.type === 'over' ? 'text-amber-800'
                    : 'text-emerald-800'
                  }`}>{advice.title}</p>
                  <p className={`text-xs mt-0.5 leading-relaxed ${
                    advice.type === 'risk' ? 'text-red-700/90'
                    : advice.type === 'over' ? 'text-amber-700/90'
                    : 'text-emerald-700/90'
                  }`}>{advice.body} {advice.action}</p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* See trends link */}
      {onSeeTrends && (
        <button
          onClick={onSeeTrends}
          className="w-full mt-auto pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          style={{ minHeight: 44 }}
        >
          See trends <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}