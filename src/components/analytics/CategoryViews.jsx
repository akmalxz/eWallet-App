// src/components/analytics/CategoryViews.jsx
import { useState, useMemo, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Coffee, ArrowUpRight, ArrowDownRight, RotateCcw
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import {
  toMYDate, dayKey, daysBetweenMY,
  startOfWeekMY, WEEKDAY_LABELS,
  nextPayday, lastNCycles
} from '../../utils/dateHelpers'
import { getCategoryColor } from '../../utils/analytics/categoryColors'
import { computeCommitmentSchedule } from '../../utils/commitments/commitmentSchedule'
import { Collapse } from '../shared/Collapse'
import { AccountCard } from '../shared/AccountCard'
import { SlidingSegmentedControl } from '../shared/SlidingSegmentedControl'
import { EmptyState, PageInfo } from './AnalyticsShared'

const LENS_ITEMS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' }
]

const formatDateMY = (dateObj) => {
  if (!dateObj) return ''
  return toMYDate(dateObj).toLocaleDateString('en-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  })
}

// ============================================================
// 1. Pocket Split Proportion Bar (No-Card Look)
// ============================================================
const PocketSplitBar = ({
  categories = [],
  total = 0,
  selectedCatName,
  onSelectCat,
  isDark = false
}) => {
  // Show top 4 categories in legend. If more than 4, group the rest as "Other" to keep UI clean
  const legendItems = useMemo(() => {
    if (!categories || categories.length === 0) return []
    if (categories.length <= 4) return categories

    const top4 = categories.slice(0, 4)
    const rest = categories.slice(4)
    const restTotal = rest.reduce((s, c) => s + (Number(c.total) || 0), 0)
    return [
      ...top4,
      {
        name: `Other (${rest.length})`,
        total: restTotal,
        isOther: true,
        color: '#94a3b8'
      }
    ]
  }, [categories])

  if (!categories || categories.length === 0 || total <= 0) return null

  return (
    <div className="space-y-2 pt-2">
      {/* 10px Multi-Segment Horizontal Bar */}
      <div className="h-2.5 rounded-full overflow-hidden flex bg-surface-2/60 w-full">
        {categories.map((cat) => {
          const pct = Math.max(0.5, (cat.total / total) * 100)
          const color = getCategoryColor(cat.name, isDark)
          const isSelected = selectedCatName === cat.name

          return (
            <div
              key={cat.name}
              style={{
                width: `${pct}%`,
                backgroundColor: color
              }}
              title={`${cat.name}: ${formatMYR(cat.total)} (${pct.toFixed(0)}%)`}
              className={`h-full transition-opacity cursor-pointer ${
                selectedCatName && !isSelected ? 'opacity-40' : 'opacity-100'
              }`}
              onClick={() => onSelectCat?.(cat.name)}
            />
          )
        })}
      </div>

      {/* Clean Top-4 + Other Legend Pips */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {legendItems.map((item) => {
          const pct = total > 0 ? (item.total / total) * 100 : 0
          const color = item.color || getCategoryColor(item.name, isDark)
          const isSelected = selectedCatName === item.name

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => !item.isOther && onSelectCat?.(item.name)}
              className={`no-min-tap inline-flex items-center gap-1.5 py-0.5 rounded-md transition-all ${
                item.isOther ? 'cursor-default text-fg-subtle' : 'cursor-pointer hover:text-fg'
              } ${
                isSelected
                  ? 'ring-1 ring-brand font-bold text-fg'
                  : 'text-fg-subtle'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-[11px] font-medium leading-none">{item.name}</span>
              <span className="text-[10px] font-semibold text-fg-muted tabular-figures leading-none">
                {pct.toFixed(0)}%
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// 3. Category Breakdown List with Direct 1-Tap Drilldown (No-Card Look)
// ============================================================
const CategoryBreakdownList = ({
  categories = [],
  total = 0,
  comparisonPeriod = null,
  lens = 'monthly',
  accounts = [],
  expandedMain,
  onToggleMain,
  activeWeekDays = null,
  isDark = false
}) => {
  const accountFor = (id) => accounts.find((a) => a.id === id)
  const maxCategoryTotal = categories.length > 0 ? categories[0].total : 1

  // Active subcategory filter per category (default: 'all')
  const [subFilters, setSubFilters] = useState({})
  // Active day-of-week filter per category (wIdx: 0..6 or null for all week)
  const [dayFilters, setDayFilters] = useState({})

  const handleSubFilter = (catName, subName) => {
    setSubFilters((prev) => ({
      ...prev,
      [catName]: prev[catName] === subName ? 'all' : subName
    }))
  }

  const handleDayFilter = (catName, wIdx) => {
    setDayFilters((prev) => ({
      ...prev,
      [catName]: prev[catName] === wIdx ? null : wIdx
    }))
  }

  return (
    <div className="space-y-1 pt-2">
      <div className="flex items-center justify-between pb-2 border-b border-line/40">
        <div>
          <h4 className="text-sm font-bold text-fg">Where Your Money Went</h4>
          <p className="text-[11px] text-fg-muted">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'} ranked by spend
          </p>
        </div>
      </div>

      <div className="divide-y divide-line/25">
        {categories.map((cat) => {
          const pct = total > 0 ? (cat.total / total) * 100 : 0
          const barWidth = Math.max(2, (cat.total / maxCategoryTotal) * 100)
          const isExpanded = expandedMain === cat.name
          const color = getCategoryColor(cat.name, isDark)

          // Benchmark comparison for this category
          const prevAmt = comparisonPeriod?.categoryMap?.[cat.name] || 0
          const diff = comparisonPeriod ? cat.total - prevAmt : 0

          // Day-of-week filter (Weekly lens only)
          const activeDayIdx = lens === 'weekly' ? (dayFilters[cat.name] ?? null) : null

          // Transactions filtered by active day (if any)
          const dayScopedTxns =
            activeDayIdx !== null
              ? cat.txns.filter((tx) => {
                  const d = toMYDate(tx.transaction_date)
                  const dow = d.getUTCDay()
                  return (dow === 0 ? 6 : dow - 1) === activeDayIdx
                })
              : cat.txns

          // Discover available subcategories within dayScopedTxns
          const daySubsMap = new Map()
          dayScopedTxns.forEach((tx) => {
            const sub = (tx.category || '').split(' > ')[1]?.trim() || 'General'
            if (!daySubsMap.has(sub)) {
              daySubsMap.set(sub, { name: sub, total: 0, count: 0 })
            }
            const sObj = daySubsMap.get(sub)
            sObj.total += Number(tx.amount || 0)
            sObj.count += 1
          })
          const availableSubs = Array.from(daySubsMap.values()).sort((a, b) => b.total - a.total)

          // Subcategory filter state (auto-fallback to 'all' if selected subcategory is not present on this day)
          const rawSubFilter = subFilters[cat.name] || 'all'
          const effectiveSubFilter =
            rawSubFilter === 'all' || daySubsMap.has(rawSubFilter) ? rawSubFilter : 'all'

          // Final displayed transactions (filtered by both day and subcategory)
          const displayTxns =
            effectiveSubFilter === 'all'
              ? dayScopedTxns
              : dayScopedTxns.filter((tx) => {
                  const sub = (tx.category || '').split(' > ')[1]?.trim() || 'General'
                  return sub === effectiveSubFilter
                })

          return (
            <div key={cat.name} id={`cat-item-${cat.name}`} className="py-2.5">
              {/* Category Row Header */}
              <button
                type="button"
                onClick={() => onToggleMain(cat.name)}
                className="w-full text-left py-1 hover:bg-surface-2/20 transition-all rounded-lg px-1 group cursor-pointer"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-bold text-fg truncate">
                      {cat.name}
                    </span>
                    <span className="text-[11px] font-semibold text-fg-subtle">
                      ({pct.toFixed(0)}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black text-fg tabular-figures">
                      {formatMYR(cat.total)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-fg-subtle group-hover:text-fg transition-colors" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-fg-subtle group-hover:text-fg transition-colors" />
                    )}
                  </div>
                </div>

                {/* Clean progress bar */}
                <div className="relative h-1.5 w-full bg-surface-2/70 rounded-full overflow-hidden mb-1">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color
                    }}
                  />
                </div>

                {/* Meta details sub-line */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-fg-subtle">
                  <div className="flex items-center gap-2">
                    <span>
                      {cat.txns.length} purchase{cat.txns.length === 1 ? '' : 's'}
                    </span>
                    {lens !== 'daily' && cat.dailyRate > 0 && (
                      <>
                        <span className="text-line-strong">•</span>
                        <span>~{formatMYR(cat.dailyRate)}/d</span>
                      </>
                    )}
                  </div>

                  {comparisonPeriod && (
                    <div
                      className="flex items-center gap-1 font-semibold"
                      title={`${diff < 0 ? 'Less' : 'More'} vs ${comparisonPeriod.label} (${formatMYR(prevAmt)})`}
                    >
                      {diff < 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 tabular-figures">
                          <ArrowDownRight className="w-3 h-3" />
                          -{formatMYR(Math.abs(diff))}
                        </span>
                      ) : diff > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5 tabular-figures">
                          <ArrowUpRight className="w-3 h-3" />
                          +{formatMYR(diff)}
                        </span>
                      ) : (
                        <span className="text-fg-subtle tabular-figures">0.00</span>
                      )}
                    </div>
                  )}
                </div>
              </button>

              {/* Direct 1-Tap Drilldown Content */}
              <Collapse open={isExpanded}>
                <div className="pt-2 pl-2 sm:pl-3 border-l-2 border-line/20 ml-1 space-y-2.5">
                  {/* Weekly Rhythm Mini-Strip (Weekly Mode only, Clickable & Unboxed) */}
                  {lens === 'weekly' && cat.weekdayAmounts && (
                    <div className="py-1.5 space-y-1.5 border-b border-line/20 pb-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <p className="font-semibold text-fg-subtle uppercase tracking-wider">
                          Weekly Rhythm (RM) {activeDayIdx !== null && `· ${WEEKDAY_LABELS[activeDayIdx]} only`}
                        </p>
                        {activeDayIdx !== null && (
                          <button
                            type="button"
                            onClick={() => handleDayFilter(cat.name, null)}
                            className="text-brand font-bold hover:underline cursor-pointer"
                          >
                            Show all days
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center">
                        {WEEKDAY_LABELS.map((wLabel, wIdx) => {
                          const wAmt = cat.weekdayAmounts[wIdx] || 0
                          const isTodayCol = activeWeekDays && activeWeekDays.todayIdx === wIdx
                          const isSelectedDay = activeDayIdx === wIdx

                          return (
                            <button
                              key={wLabel}
                              type="button"
                              onClick={() => handleDayFilter(cat.name, wIdx)}
                              className={`py-1.5 px-0.5 rounded-lg flex flex-col items-center gap-0.5 transition-all cursor-pointer select-none ${
                                isSelectedDay
                                  ? 'bg-fg text-fg-inverse font-bold shadow-xs'
                                  : isTodayCol
                                  ? 'bg-brand/15 text-fg ring-1 ring-brand/30 hover:bg-brand/25'
                                  : wAmt > 0
                                  ? 'hover:bg-surface-2/60 text-fg'
                                  : 'opacity-40 hover:opacity-75 text-fg-subtle hover:bg-surface-2/30'
                              }`}
                              title={`${wLabel}: ${wAmt > 0 ? formatMYR(wAmt) : 'RM 0'} (click to filter transactions)`}
                            >
                              <span
                                className={`text-[9px] ${
                                  isSelectedDay
                                    ? 'text-fg-inverse font-bold'
                                    : isTodayCol
                                    ? 'text-brand font-bold'
                                    : 'text-fg-subtle'
                                }`}
                              >
                                {wLabel}
                              </span>
                              <span className="text-[10px] font-semibold tabular-figures truncate w-full">
                                {wAmt > 0 ? (wAmt % 1 === 0 ? wAmt.toFixed(0) : wAmt.toFixed(2)) : '—'}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Subcategory Filter Pills (Horizontal swipe on mobile, wrap on sm+) */}
                  {(cat.subs.length > 1 || availableSubs.length > 1) && dayScopedTxns.length > 0 && (
                    <div className="flex sm:flex-wrap items-center gap-1.5 py-1 overflow-x-auto no-scrollbar -mx-1 px-1">
                      <button
                        type="button"
                        onClick={() => handleSubFilter(cat.name, 'all')}
                        className={`no-min-tap h-7 shrink-0 px-2.5 inline-flex items-center rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          effectiveSubFilter === 'all'
                            ? 'bg-fg text-fg-inverse font-bold'
                            : 'bg-surface-2/60 text-fg-subtle hover:text-fg'
                        }`}
                      >
                        All ({dayScopedTxns.length})
                      </button>
                      {availableSubs.map((sub) => {
                        const isSubActive = effectiveSubFilter === sub.name
                        return (
                          <button
                            key={sub.name}
                            type="button"
                            onClick={() => handleSubFilter(cat.name, sub.name)}
                            className={`no-min-tap h-7 shrink-0 px-2.5 inline-flex items-center rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                              isSubActive
                                ? 'bg-fg text-fg-inverse font-bold'
                                : 'bg-surface-2/60 text-fg-subtle hover:text-fg'
                            }`}
                          >
                            {sub.name} ({sub.count}) · {formatMYR(sub.total)}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Transactions List (Direct 1-Tap Access, Filtered by Day & Subcategory) */}
                  {displayTxns.length === 0 ? (
                    <div className="py-4 text-center text-xs text-fg-muted">
                      No {cat.name} expenses {activeDayIdx !== null ? `on ${WEEKDAY_LABELS[activeDayIdx]}` : 'recorded'}.
                      {activeDayIdx !== null && (
                        <button
                          type="button"
                          onClick={() => handleDayFilter(cat.name, null)}
                          className="block mx-auto mt-1.5 text-brand font-bold hover:underline cursor-pointer"
                        >
                          Show all days
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-line/15 border-t border-line/15 pt-0.5">
                      {displayTxns.map((tx, txIdx) => {
                        const sourceAcc = accountFor(tx.source_account_id)
                        const txDateLabel = formatDateMY(tx.transaction_date)
                        const isDateRedundant = lens === 'daily' || activeDayIdx !== null
                        const subLabel =
                          (cat.subs.length > 1 || availableSubs.length > 1)
                            ? (tx.category || '').split(' > ')[1]?.trim()
                            : null

                        return (
                          <div
                            key={tx.id || `${cat.name}-${txIdx}`}
                            className="flex items-center justify-between gap-3 py-2 px-1 hover:bg-surface-2/20 transition-all rounded"
                          >
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <p className="text-xs font-medium text-fg truncate">
                                {tx.description || 'Untitled'}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-fg-subtle min-w-0">
                                {!isDateRedundant && <span>{txDateLabel}</span>}
                                {subLabel && (
                                  <>
                                    {!isDateRedundant && (
                                      <span className="text-line-strong shrink-0">•</span>
                                    )}
                                    <span className="text-fg-muted font-medium">{subLabel}</span>
                                  </>
                                )}
                                {sourceAcc && (
                                  <>
                                    <span className="text-line-strong shrink-0">•</span>
                                    <AccountCard
                                      account={sourceAcc}
                                      size="chip"
                                      showIcon={false}
                                    />
                                  </>
                                )}
                                {tx.notes && (
                                  <>
                                    <span className="text-line-strong shrink-0">•</span>
                                    <span className="italic truncate max-w-[140px]">
                                      "{tx.notes}"
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <span className="text-xs font-bold tabular-figures text-fg shrink-0">
                              -{formatMYR(tx.amount)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Collapse>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ============================================================
// 5. Main Categories View Container
// ============================================================
export const CategoryViews = ({
  expenses = [],
  accounts = [],
  commitments = [],
  commitmentPayments = [],
  profile
}) => {
  const [lens, setLens] = useState('monthly') // 'daily' | 'weekly' | 'monthly'
  const [dayOffset, setDayOffset] = useState(0) // 0 = today, -1 = yesterday, etc.
  const [weekOffset, setWeekOffset] = useState(0) // 0 = this week, -1 = last week, etc.
  const [cycleOffset, setCycleOffset] = useState(0) // 0 = this cycle, -1 = last cycle, etc.

  const [expandedMain, setExpandedMain] = useState(null)
  const [selectedCatName, setSelectedCatName] = useState(null)

  const now = useMemo(() => new Date(), [])

  // Check dark mode
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Auto-scroll when a category is selected via split bar
  const handleSelectCat = (catName) => {
    setSelectedCatName((prev) => (prev === catName ? null : catName))
    setExpandedMain(catName)
    const el = document.getElementById(`cat-item-${catName}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  // ------------------------------------------------------------
  // Spendable Liquid Cash Daily Target (Synchronized with Trends custom target)
  // ------------------------------------------------------------
  const dailyTarget = useMemo(() => {
    try {
      const saved = localStorage.getItem('analytics_daily_limit')
      if (saved && Number(saved) > 0) return Number(saved)
    } catch {
      /* ignore */
    }

    const nonSavingsAccounts = (accounts || []).filter((a) => {
      if (a.is_archived) return false
      const cls = (a.classification || '').toLowerCase()
      return !['savings', 'fixed_price_ut', 'pilgrimage', 'investment', 'credit'].includes(cls)
    })
    const nonSavingsBal = nonSavingsAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)

    const payday = nextPayday(now, () => false, profile?.payday_type, profile?.payday_date)
    const days = Math.max(1, daysBetweenMY(now, payday))

    const schedule = computeCommitmentSchedule({
      commitments: commitments || [],
      payments: commitmentPayments || [],
      accounts: accounts || [],
      scopeAccountId: 'all',
      now,
      horizon: payday,
      paydayType: profile?.payday_type,
      paydayDate: profile?.payday_date
    })

    const bills = schedule?.total || 0
    const freeCash = Math.max(0, nonSavingsBal - bills)
    const pace = freeCash / days
    return pace >= 15 ? Math.max(20, Math.round(pace / 5) * 5) : 50
  }, [accounts, commitments, commitmentPayments, profile, now])

  // ------------------------------------------------------------
  // Lens Window Data Computation
  // ------------------------------------------------------------
  const windowData = useMemo(() => {
    const all = expenses || []

    // 1. DAILY
    if (lens === 'daily') {
      const targetDate = new Date(now.getTime() + dayOffset * 86400000)
      const targetKey = dayKey(targetDate)
      const prevDate = new Date(targetDate.getTime() - 86400000)
      const prevKey = dayKey(prevDate)

      const isToday = dayOffset === 0
      const isYesterday = dayOffset === -1

      const primaryTitle = isToday
        ? 'Today'
        : isYesterday
        ? 'Yesterday'
        : toMYDate(targetDate).toLocaleDateString('en-MY', { weekday: 'short', timeZone: 'UTC' })
      const secondaryTitle = formatDateMY(targetDate)

      const activeTxns = all.filter((tx) => dayKey(tx.transaction_date) === targetKey)
      const prevTxns = all.filter((tx) => dayKey(tx.transaction_date) === prevKey)

      const thisTotal = activeTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0)
      const prevTotal = prevTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0)
      const diff = thisTotal - prevTotal

      const prevCategoryMap = {}
      prevTxns.forEach((tx) => {
        const cat = (tx.category || 'Uncategorized').split(' > ')[0].trim()
        prevCategoryMap[cat] = (prevCategoryMap[cat] || 0) + (Number(tx.amount) || 0)
      })

      return {
        lens,
        primaryTitle,
        secondaryTitle,
        title: `${primaryTitle} (${secondaryTitle})`,
        subTitle: null, // Avoid duplicate purchase count on left
        isCurrent: isToday,
        activeTxns,
        thisTotal,
        prevTotal,
        diff,
        elapsedDays: 1,
        dailyRate: thisTotal,
        comparisonPeriod: {
          label: isToday ? 'yesterday' : 'previous day',
          categoryMap: prevCategoryMap,
          total: prevTotal
        },
        activeWeekDays: null
      }
    }

    // 2. WEEKLY
    if (lens === 'weekly') {
      const seed = new Date(now.getTime() + weekOffset * 7 * 86400000)
      const wStart = startOfWeekMY(seed)
      const wEnd = new Date(wStart.getTime() + 7 * 86400000 - 1)

      const isCurrentWeek = weekOffset === 0
      const isLastWeek = weekOffset === -1

      const nowMs = now.getTime()
      const elapsedDays = isCurrentWeek
        ? Math.max(1, Math.min(7, Math.ceil((nowMs - wStart.getTime() + 1) / 86400000)))
        : 7

      const startLabel = toMYDate(wStart).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC'
      })
      const endLabel = toMYDate(wEnd).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC'
      })

      const primaryTitle = isCurrentWeek
        ? 'This Week'
        : isLastWeek
        ? 'Last Week'
        : 'Past Week'
      const secondaryTitle = `${startLabel} – ${endLabel}`
      const title = `${primaryTitle} (${secondaryTitle})`

      const subTitle = isCurrentWeek ? `Day ${elapsedDays} of 7` : '7 days'

      const activeTxns = all.filter((tx) => {
        const txMs = new Date(tx.transaction_date).getTime()
        return txMs >= wStart.getTime() && txMs <= wEnd.getTime()
      })

      const thisTotal = activeTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0)

      // Comparison: Preceding week
      const prevStart = new Date(wStart.getTime() - 7 * 86400000)
      const prevEnd = new Date(prevStart.getTime() + 7 * 86400000 - 1)
      const prevAllTxns = all.filter((tx) => {
        const txMs = new Date(tx.transaction_date).getTime()
        return txMs >= prevStart.getTime() && txMs <= prevEnd.getTime()
      })

      let prevBenchmarkTxns = prevAllTxns
      let comparisonLabel = 'last week'

      if (isCurrentWeek) {
        const pacedEndMs = prevStart.getTime() + elapsedDays * 86400000
        prevBenchmarkTxns = prevAllTxns.filter(
          (t) => new Date(t.transaction_date).getTime() <= pacedEndMs
        )
        comparisonLabel = 'last wk pace'
      }

      const prevTotal = prevBenchmarkTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0)
      const diff = thisTotal - prevTotal

      const prevCategoryMap = {}
      prevBenchmarkTxns.forEach((tx) => {
        const cat = (tx.category || 'Uncategorized').split(' > ')[0].trim()
        prevCategoryMap[cat] = (prevCategoryMap[cat] || 0) + (Number(tx.amount) || 0)
      })

      const nowDow = toMYDate(now).getUTCDay()
      const todayIdx = nowDow === 0 ? 6 : nowDow - 1

      return {
        lens,
        primaryTitle,
        secondaryTitle,
        title,
        subTitle,
        isCurrent: isCurrentWeek,
        activeTxns,
        thisTotal,
        prevTotal,
        diff,
        elapsedDays,
        dailyRate: elapsedDays > 0 ? thisTotal / elapsedDays : 0,
        comparisonPeriod: {
          label: comparisonLabel,
          categoryMap: prevCategoryMap,
          total: prevTotal
        },
        activeWeekDays: { todayIdx: isCurrentWeek ? todayIdx : null }
      }
    }

    // 3. MONTHLY (Pay Cycle)
    const cycles = lastNCycles(12, now, profile?.payday_type, profile?.payday_date)
    const maxIdx = cycles.length - 1
    const selectedIdx = Math.max(0, Math.min(maxIdx, maxIdx + cycleOffset))
    const activeCycle = cycles[selectedIdx]
    const prevCycle = selectedIdx > 0 ? cycles[selectedIdx - 1] : null

    const isCurrentCycle = selectedIdx === maxIdx
    const isLastCycle = selectedIdx === maxIdx - 1

    const cStartMs = activeCycle.startDate.getTime()
    const cEndMs = activeCycle.endDate.getTime()
    const totalCycleDays = Math.max(1, Math.ceil((cEndMs - cStartMs + 1) / 86400000))

    const elapsedDays = isCurrentCycle
      ? Math.max(1, Math.min(totalCycleDays, daysBetweenMY(activeCycle.startDate, now) + 1))
      : totalCycleDays
    const daysLeft = Math.max(0, totalCycleDays - elapsedDays)

    const primaryTitle = isCurrentCycle
      ? 'This Cycle'
      : isLastCycle
      ? 'Last Cycle'
      : 'Past Cycle'
    const secondaryTitle = activeCycle.label
    const title = `${primaryTitle} (${secondaryTitle})`

    const subTitle = isCurrentCycle
      ? `Day ${elapsedDays} of ${totalCycleDays} (${daysLeft}d left)`
      : `${totalCycleDays} days`

    const activeTxns = all.filter((tx) => {
      const txMs = new Date(tx.transaction_date).getTime()
      return txMs >= cStartMs && txMs <= cEndMs
    })

    const thisTotal = activeTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0)

    let prevBenchmarkTxns = []
    let comparisonLabel = 'last cycle'

    if (prevCycle) {
      const pStartMs = prevCycle.startDate.getTime()
      const pEndMs = prevCycle.endDate.getTime()
      const prevAll = all.filter((tx) => {
        const txMs = new Date(tx.transaction_date).getTime()
        return txMs >= pStartMs && txMs <= pEndMs
      })

      if (isCurrentCycle) {
        const pacedEndMs = pStartMs + elapsedDays * 86400000
        prevBenchmarkTxns = prevAll.filter(
          (t) => new Date(t.transaction_date).getTime() <= pacedEndMs
        )
        comparisonLabel = `Day ${elapsedDays} last cycle`
      } else {
        prevBenchmarkTxns = prevAll
        comparisonLabel = 'last cycle'
      }
    }

    const prevTotal = prevBenchmarkTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0)
    const diff = prevCycle ? thisTotal - prevTotal : 0

    const prevCategoryMap = {}
    prevBenchmarkTxns.forEach((tx) => {
      const cat = (tx.category || 'Uncategorized').split(' > ')[0].trim()
      prevCategoryMap[cat] = (prevCategoryMap[cat] || 0) + (Number(tx.amount) || 0)
    })

    return {
      lens,
      primaryTitle,
      secondaryTitle,
      title,
      subTitle,
      isCurrent: isCurrentCycle,
      activeTxns,
      thisTotal,
      prevTotal,
      diff,
      elapsedDays,
      dailyRate: elapsedDays > 0 ? thisTotal / elapsedDays : 0,
      comparisonPeriod: prevCycle
        ? {
            label: comparisonLabel,
            categoryMap: prevCategoryMap,
            total: prevTotal
          }
        : null,
      activeWeekDays: null
    }
  }, [lens, dayOffset, weekOffset, cycleOffset, expenses, now, profile])

  // Reset pagination when lens changes
  const handleLensChange = (newL) => {
    setLens(newL)
    setDayOffset(0)
    setWeekOffset(0)
    setCycleOffset(0)
    setExpandedMain(null)
    setSelectedCatName(null)
  }

  // Stepper handlers
  const handleStep = (delta) => {
    setExpandedMain(null)
    setSelectedCatName(null)
    if (lens === 'daily') setDayOffset((prev) => prev + delta)
    if (lens === 'weekly') setWeekOffset((prev) => prev + delta)
    if (lens === 'monthly') setCycleOffset((prev) => prev + delta)
  }

  const handleResetToCurrent = () => {
    if (lens === 'daily') setDayOffset(0)
    if (lens === 'weekly') setWeekOffset(0)
    if (lens === 'monthly') setCycleOffset(0)
  }

  // ------------------------------------------------------------
  // Group Active Transactions into Categories and Subcategories
  // ------------------------------------------------------------
  const groupedCategories = useMemo(() => {
    const { activeTxns, elapsedDays } = windowData
    if (!activeTxns || activeTxns.length === 0) return []

    const map = new Map()

    activeTxns.forEach((tx) => {
      const parts = (tx.category || 'Uncategorized').split(' > ')
      const main = parts[0].trim()
      const sub = parts.length > 1 ? parts.slice(1).join(' > ').trim() : 'General'
      const amt = Number(tx.amount) || 0

      if (!map.has(main)) {
        map.set(main, {
          name: main,
          total: 0,
          subs: new Map(),
          txns: [],
          weekdayAmounts: [0, 0, 0, 0, 0, 0, 0]
        })
      }

      const mObj = map.get(main)
      mObj.total += amt
      mObj.txns.push(tx)

      // Weekday rhythm tally
      const d = toMYDate(tx.transaction_date)
      const dow = d.getUTCDay()
      const wIdx = dow === 0 ? 6 : dow - 1
      mObj.weekdayAmounts[wIdx] += amt

      if (!mObj.subs.has(sub)) {
        mObj.subs.set(sub, { name: sub, total: 0, txns: [] })
      }
      const sObj = mObj.subs.get(sub)
      sObj.total += amt
      sObj.txns.push(tx)
    })

    return Array.from(map.values())
      .map((cat) => ({
        ...cat,
        dailyRate: elapsedDays > 0 ? cat.total / elapsedDays : 0,
        subs: Array.from(cat.subs.values())
          .map((sub) => ({
            ...sub,
            txns: sub.txns.sort(
              (a, b) =>
                new Date(b.transaction_date).getTime() -
                  new Date(a.transaction_date).getTime() ||
                Number(b.amount || 0) - Number(a.amount || 0)
            )
          }))
          .sort((a, b) => b.total - a.total),
        txns: cat.txns.sort(
          (a, b) =>
            new Date(b.transaction_date).getTime() -
              new Date(a.transaction_date).getTime() ||
            Number(b.amount || 0) - Number(a.amount || 0)
        )
      }))
      .sort((a, b) => b.total - a.total)
  }, [windowData])

  const toggleMain = (name) => {
    setExpandedMain((prev) => (prev === name ? null : name))
  }

  const isCurrent = windowData.isCurrent

  return (
    <div className="space-y-6">
      {/* 1. Time Lens Segmented Switcher & Stepper */}
      <div className="space-y-3">
        <div className="w-full sm:w-64">
          <SlidingSegmentedControl
            items={LENS_ITEMS}
            value={lens}
            onChange={handleLensChange}
          />
        </div>

        {/* Mobile Info row + Return to Current Period button */}
        <div className="flex items-center justify-between min-h-[32px] -mt-1">
          <div className="md:hidden">
            <PageInfo tab="categories" />
          </div>
          {!isCurrent && (
            <button
              type="button"
              onClick={handleResetToCurrent}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-brand hover:bg-brand/10 rounded-lg transition-colors cursor-pointer ml-auto"
              title={`Return to current ${lens}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {lens === 'daily' ? 'Today' : lens === 'weekly' ? 'This Week' : 'This Cycle'}
              </span>
            </button>
          )}
        </div>

        {/* Period Title & High-level Metrics with Integrated Stepper (No-Card Look) */}
        <div className="flex items-start justify-between gap-2 sm:gap-3 pt-1 border-b border-line/30 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => handleStep(-1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer shrink-0 -ml-1"
                aria-label="Previous period"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div
                className={`min-w-0 flex flex-col justify-center ${
                  lens === 'weekly' ? 'items-start text-left' : 'items-center text-center'
                }`}
              >
                <h3 className="text-sm sm:text-base font-bold text-fg leading-tight truncate w-full">
                  {windowData.primaryTitle}
                </h3>
                {windowData.secondaryTitle && (
                  <p className="text-[11px] text-fg-subtle leading-tight truncate mt-0.5 w-full">
                    {windowData.secondaryTitle}
                  </p>
                )}
                {windowData.subTitle && (
                  <p className="text-[11px] text-fg-subtle leading-tight truncate mt-0.5 w-full">
                    {windowData.subTitle}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleStep(1)}
                disabled={isCurrent}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0 ${
                  isCurrent
                    ? 'opacity-20 cursor-not-allowed text-fg-subtle'
                    : 'text-fg-subtle hover:text-fg hover:bg-surface-2 cursor-pointer'
                }`}
                aria-label="Next period"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-base sm:text-lg font-black text-fg tabular-figures">
              {formatMYR(windowData.thisTotal)}
            </div>
            <div className="text-[10px] text-fg-subtle flex flex-col sm:flex-row sm:items-center sm:gap-1.5 justify-end mt-0.5">
              <span>
                {windowData.activeTxns.length} purchase{windowData.activeTxns.length === 1 ? '' : 's'}
              </span>
              {lens !== 'daily' && (
                <>
                  <span className="hidden sm:inline text-line-strong">•</span>
                  <span>~{formatMYR(windowData.dailyRate)}/d</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Daily Target Status (Daily Lens) OR Pace Delta Pill (Weekly / Monthly) */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {lens === 'daily' && isCurrent && (
            <div className="text-xs">
              {windowData.thisTotal > dailyTarget ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  Over limit by {formatMYR(windowData.thisTotal - dailyTarget)} (Target: {formatMYR(dailyTarget)})
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {formatMYR(dailyTarget - windowData.thisTotal)} left of {formatMYR(dailyTarget)} daily target
                </span>
              )}
            </div>
          )}

          {lens !== 'daily' && windowData.comparisonPeriod && (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  windowData.diff < 0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : windowData.diff > 0
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-surface-2 text-fg-subtle border border-line'
                }`}
              >
                {windowData.diff < 0 ? (
                  <>↓ {formatMYR(Math.abs(windowData.diff))} vs {windowData.comparisonPeriod.label}</>
                ) : windowData.diff > 0 ? (
                  <>↑ +{formatMYR(windowData.diff)} vs {windowData.comparisonPeriod.label}</>
                ) : (
                  <>On par with {windowData.comparisonPeriod.label}</>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Empty State if no spending recorded */}
      {windowData.thisTotal <= 0 ? (
        <EmptyState
          icon={Coffee}
          title="No expenses in this period"
          message="No purchases were recorded for this timeframe."
        />
      ) : (
        <>
          {/* 2. Pocket Split Proportion Bar */}
          <PocketSplitBar
            categories={groupedCategories}
            total={windowData.thisTotal}
            selectedCatName={selectedCatName}
            onSelectCat={handleSelectCat}
            isDark={isDark}
          />

          {/* 3. Complete Category Breakdown List with Direct 1-Tap Drilldown */}
          <CategoryBreakdownList
            categories={groupedCategories}
            total={windowData.thisTotal}
            comparisonPeriod={windowData.comparisonPeriod}
            lens={lens}
            accounts={accounts}
            expandedMain={expandedMain}
            onToggleMain={toggleMain}
            activeWeekDays={windowData.activeWeekDays}
            isDark={isDark}
          />
        </>
      )}
    </div>
  )
}
