// src/components/dashboard/BurnRateWidget.jsx
import { useState, useEffect, useRef } from 'react'
import {
  TrendingUp, TrendingDown, AlertCircle, ChevronDown, ChevronUp,
  Coffee, Check, ArrowRight, HelpCircle, PartyPopper
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { COLORS } from '../../utils/analyticsColors'
import { CRITICAL_RUNWAY_DAYS, NEAR_PAYDAY_DAYS } from '../../utils/burnRateEngine'

const compactMYR = (n) => {
  const abs = Math.abs(n || 0)
  if (abs >= 1000000) return `RM ${(n / 1000000).toFixed(1)}M`
  if (abs >= 1000) return `RM ${(n / 1000).toFixed(1)}k`
  return formatMYR(n)
}

const formatDate = (d) =>
  d?.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })

export const BurnRateWidget = ({ velocityStats, onSeeTrends, onOpenHelp }) => {
  const [showDetails, setShowDetails] = useState(() => {
    try { return localStorage.getItem('burnRateExpanded') === 'true' } catch { return false }
  })
  const detailsRef = useRef(null)

  useEffect(() => {
    try { localStorage.setItem('burnRateExpanded', String(showDetails)) } catch {}
  }, [showDetails])

  // Keep collapsed details non-focusable
  useEffect(() => {
    const el = detailsRef.current
    if (!el) return
    if (showDetails) el.removeAttribute('inert')
    else el.setAttribute('inert', '')
  }, [showDetails])

  const {
    scopeLabel = 'Account',
    payday,
    isPaydayToday = false,

    balance = 0,
    billsBeforePayday = 0,
    freeMoney = 0,
    everydaySpentThisMonth = 0,
    dailyAverage = 0,
    safeDailySpend = 0,
    runwayDays = 9999,
    daysToPayday = 0,
    daysPassed = 0,
    monthLength = 30,

    runoutDate = null,
    runsOutBeforePayday = false,
    expectedBalanceAtPayday = 0,

    spendingTrend = 0,

    reviewCount = 0,
    billCount = 0,

    status = 'no_data',
    shortfall = 0
  } = velocityStats || {}

  const hasEverydayData = everydaySpentThisMonth > 0 && dailyAverage > 0
  const isInfiniteRunway = runwayDays === 9999 || runwayDays > 365
  const freeMoneyNegative = freeMoney < 0

  const statusBadge = (() => {
    switch (status) {
      case 'payday_today':
        return { label: 'Payday', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: PartyPopper }
      case 'bills_exceed_balance':
        return { label: 'Bills exceed', color: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle }
      case 'at_risk':
        return { label: 'At risk', color: 'bg-red-50 text-red-700 border-red-200', icon: TrendingDown }
      case 'tight':
        return { label: 'Tight', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertCircle }
      case 'on_track':
        return { label: 'On track', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: TrendingUp }
      case 'no_data':
      default:
        return { label: '', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: Coffee }
    }
  })()

  const StatusIcon = statusBadge.icon

  const accent = (() => {
    if (status === 'no_data') return 'bg-slate-200'
    if (status === 'bills_exceed_balance' || status === 'at_risk') return 'bg-red-500'
    if (status === 'tight') return 'bg-amber-500'
    return 'bg-emerald-500'
  })()

  const runwayPercent = daysToPayday > 0
    ? Math.min(100, (runwayDays / daysToPayday) * 100)
    : 100

  const markerColor = (() => {
    if (!runsOutBeforePayday) return COLORS.down
    if (runwayDays < CRITICAL_RUNWAY_DAYS) return COLORS.up
    const daysAfterRunout = daysToPayday - runwayDays
    if (daysAfterRunout <= NEAR_PAYDAY_DAYS) return '#f59e0b'
    return COLORS.up
  })()

  const barFillColor = (() => {
    if (!runsOutBeforePayday) {
      return 'linear-gradient(to right, #10b981, #059669)'
    }
    if (runwayDays < CRITICAL_RUNWAY_DAYS) {
      return 'linear-gradient(to right, #ef4444, #f43f5e)'
    }
    const daysAfterRunout = daysToPayday - runwayDays
    if (daysAfterRunout <= NEAR_PAYDAY_DAYS) {
      return 'linear-gradient(to right, #f59e0b, #f97316)'
    }
    return 'linear-gradient(to right, #f59e0b, #f97316)'
  })()

  const advice = (() => {
    if (status === 'bills_exceed_balance') {
      return {
        type: 'risk',
        title: 'Bills exceed balance',
        body: `Your unpaid bills are ${formatMYR(shortfall)} more than your balance.`,
        action: 'Pause or reschedule a bill to get back on track.'
      }
    }
    if (status === 'at_risk') {
      return {
        type: 'risk',
        title: 'Runway risk',
        body: `At this pace, your money runs out in ${runwayDays} day${runwayDays === 1 ? '' : 's'}.`,
        action: `Keep daily spend under ${formatMYR(safeDailySpend)} to last until payday.`
      }
    }
    if (status === 'tight') {
      return {
        type: 'over',
        title: 'Running tight',
        body: `Your daily pace is close to your safe limit of ${formatMYR(safeDailySpend)}.`,
        action: `Trim a little to finish with cushion.`
      }
    }
    if (status === 'on_track') {
      return {
        type: 'good',
        title: 'On track',
        body: `Your pace is sustainable at ${formatMYR(dailyAverage)}/day.`,
        action: `Expected to finish with ${formatMYR(Math.max(0, expectedBalanceAtPayday))} to spare.`
      }
    }
    return null
  })()

  return (
    <div className="relative flex flex-col h-full">
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-full ${accent}`} />

      {/* Header */}
      <div className="flex justify-between items-start mb-4 gap-3 pt-4">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800">Burn Rate</h2>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{scopeLabel}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenHelp}
            disabled={!onOpenHelp}
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label="How this is calculated"
            title="How this is calculated"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          {statusBadge.label && (
            <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider flex items-center gap-1.5 border shadow-sm ${statusBadge.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              <span className="uppercase">{statusBadge.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payday today special state */}
      {status === 'payday_today' ? (
        <div className="flex flex-col items-center justify-center p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl mb-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3">
            <PartyPopper className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-emerald-800">It's payday!</p>
          <p className="text-xs text-emerald-700 mt-1 text-center max-w-[240px] leading-relaxed">
            Your numbers will refresh for the new month tomorrow.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">Free money</p>
              <p
                className={`text-sm font-black truncate ${freeMoneyNegative ? 'text-red-600' : 'text-slate-800'}`}
                title={formatMYR(freeMoney)}
              >
                {compactMYR(freeMoney)}
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">Daily avg</p>
              <p className="text-sm font-black text-slate-800 truncate" title={formatMYR(dailyAverage)}>
                {hasEverydayData ? compactMYR(dailyAverage) : '—'}
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">Runway</p>
              <p className={`text-sm font-black ${!hasEverydayData ? 'text-slate-400' : runwayDays < CRITICAL_RUNWAY_DAYS ? 'text-red-600' : 'text-slate-800'}`}>
                {isInfiniteRunway ? '∞' : `${runwayDays}d`}
              </p>
            </div>
          </div>

          {hasEverydayData && Math.abs(spendingTrend) > 5 && (
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

          {hasEverydayData ? (
            <div className="mb-3">
              <div className="relative w-full bg-slate-100 rounded-full h-3">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: runsOutBeforePayday ? `${runwayPercent}%` : '100%',
                    background: barFillColor
                  }}
                />
                {runsOutBeforePayday && (
                  <div
                    className="absolute -top-1 w-1 h-5 rounded-full shadow-md transition-all duration-1000"
                    style={{
                      left: `calc(${runwayPercent}% - 2px)`,
                      backgroundColor: markerColor
                    }}
                    aria-label={`Projected runout in ${runwayDays} days`}
                    title={runoutDate ? `Runs out ${formatDate(runoutDate)}` : ''}
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mt-1.5">
                <span>Today</span>
                <span>Payday · {formatDate(payday)}</span>
              </div>

              {runsOutBeforePayday && runoutDate ? (
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  At this pace, your money runs out on{' '}
                  <strong className="text-slate-700">{formatDate(runoutDate)}</strong>,
                  {' '}{daysToPayday - runwayDays} day{daysToPayday - runwayDays === 1 ? '' : 's'} before payday.
                </p>
              ) : (
                <p className="text-xs text-emerald-600 mt-3 leading-relaxed font-medium">
                  Lasts until payday, with about {formatMYR(Math.max(0, expectedBalanceAtPayday))} to spare.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 bg-white/50 border-2 border-slate-200 border-dashed rounded-2xl mt-2">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                <Coffee className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No everyday spending yet</p>
              <p className="text-xs text-slate-400 mt-1 text-center max-w-[240px] leading-relaxed">
                Log an expense this month to see your runway.
              </p>
            </div>
          )}
        </>
      )}

      {reviewCount > 0 && (
        <p className="text-[10px] text-slate-400 mt-3 px-1">
          Includes {reviewCount} item{reviewCount === 1 ? '' : 's'} waiting for review
        </p>
      )}

      {hasEverydayData && status !== 'payday_today' && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          style={{ minHeight: 44 }}
          aria-expanded={showDetails}
          aria-controls="burn-rate-details"
        >
          <span>{showDetails ? 'Fewer details' : 'More details'}</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      )}

      {hasEverydayData && status !== 'payday_today' && (
        <div
          id="burn-rate-details"
          ref={detailsRef}
          className={`grid transition-all duration-300 ease-in-out ${showDetails ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div className="overflow-hidden space-y-3">
            <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Balance</p>
              <p className="text-sm font-black text-slate-700 mt-1">{formatMYR(balance)}</p>
            </div>

            <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Bills before payday</p>
                {billCount > 0 && (
                  <span className="text-[10px] font-bold text-slate-400">
                    {billCount} bill{billCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <p className="text-sm font-black text-slate-700">− {formatMYR(billsBeforePayday)}</p>
            </div>

            <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Free money</p>
              <p className={`text-base font-black mt-1 ${freeMoneyNegative ? 'text-red-500' : 'text-slate-800'}`}>
                {formatMYR(freeMoney)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Balance minus unpaid bills before payday.
              </p>
            </div>

            <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Safe daily spend</p>
              <p className="text-sm font-black text-slate-700 mt-1">
                {safeDailySpend > 0 ? formatMYR(safeDailySpend) : '—'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Free money divided by {daysToPayday} day{daysToPayday === 1 ? '' : 's'} to payday.
              </p>
            </div>

            <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Your daily average</p>
              <p className={`text-sm font-black mt-1 ${safeDailySpend > 0 && dailyAverage > safeDailySpend ? 'text-red-500' : 'text-emerald-500'}`}>
                {formatMYR(dailyAverage)}
              </p>
            </div>

            <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Expected balance at payday</p>
                <p className={`text-base font-black mt-0.5 ${expectedBalanceAtPayday < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                  {formatMYR(expectedBalanceAtPayday)}
                </p>
              </div>
              <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider shrink-0 border ${
                expectedBalanceAtPayday < 0
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {expectedBalanceAtPayday < 0 ? 'Deficit' : 'Surplus'}
              </div>
            </div>

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