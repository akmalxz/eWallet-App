// src/components/analytics/CategoryMovement.jsx
import { useState, useMemo } from 'react'
import { ArrowUpRight, ArrowDownRight, Minus, Layers } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { monthKey, lastNMonths } from '../../utils/dateHelpers'
import { COLORS, CATEGORY_COLORS } from '../../utils/analyticsColors'
import { EmptyState } from './AnalyticsShared'

const mainCat = (cat) => (cat || 'Uncategorized').split(' > ')[0]
const SMALL_THRESHOLD = 50 // group categories < this under "Other"

export const CategoryMovement = ({ expenses, periodMonths }) => {
  const [expandedCat, setExpandedCat] = useState(null)
  const [selectedMonthKey, setSelectedMonthKey] = useState(null)

  const {
    rows,
    months,
    stackedData,
    topCategories,
    thisMonthTotal,
    lastMonthTotal
  } = useMemo(() => {
    const now = new Date()
    const thisKey = monthKey(now)
    const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastKey = monthKey(lastDate)

    // This vs last month per main category
    const thisTotals = {}
    const lastTotals = {}
    const txByCat = {}

    expenses.forEach(tx => {
      const k = monthKey(tx.transaction_date)
      const c = mainCat(tx.category)
      const amt = Number(tx.amount) || 0
      if (k === thisKey) {
        thisTotals[c] = (thisTotals[c] || 0) + amt
        if (!txByCat[c]) txByCat[c] = []
        txByCat[c].push(tx)
      } else if (k === lastKey) {
        lastTotals[c] = (lastTotals[c] || 0) + amt
      }
    })

    const allCats = new Set([...Object.keys(thisTotals), ...Object.keys(lastTotals)])

    const rawRows = Array.from(allCats).map(c => {
      const now_ = thisTotals[c] || 0
      const before = lastTotals[c] || 0
      const diff = now_ - before
      const pct = before > 0 ? (diff / before) * 100 : null
      return {
        category: c,
        thisMonth: now_,
        lastMonth: before,
        diff,
        pct,
        isNew: before === 0 && now_ > 0,
        dropped: now_ === 0 && before > 0,
        txns: txByCat[c] || []
      }
    })

    // Group smalls under Other
    const big = rawRows.filter(r => Math.abs(r.diff) >= SMALL_THRESHOLD)
    const smalls = rawRows.filter(r => Math.abs(r.diff) < SMALL_THRESHOLD)
    const otherRow = smalls.length > 0 ? {
      category: 'Other',
      thisMonth: smalls.reduce((s, r) => s + r.thisMonth, 0),
      lastMonth: smalls.reduce((s, r) => s + r.lastMonth, 0),
      diff: smalls.reduce((s, r) => s + r.diff, 0),
      pct: null,
      isNew: false,
      dropped: false,
      txns: smalls.flatMap(r => r.txns),
      isOther: true
    } : null

    // Sort by absolute ringgit change
    const sorted = [...big, ...(otherRow ? [otherRow] : [])]
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

    // Stacked monthly data
    const monthList = lastNMonths(Math.min(periodMonths, 6), now)
    const totalsByMonth = monthList.map(m => ({ ...m, cats: {} }))

    expenses.forEach(tx => {
      const k = monthKey(tx.transaction_date)
      const slot = totalsByMonth.find(m => m.key === k)
      if (slot) {
        const c = mainCat(tx.category)
        slot.cats[c] = (slot.cats[c] || 0) + Number(tx.amount || 0)
      }
    })

    // Keep top N categories, group rest as Other
    const catGrandTotals = {}
    totalsByMonth.forEach(m => {
      Object.entries(m.cats).forEach(([c, v]) => {
        catGrandTotals[c] = (catGrandTotals[c] || 0) + v
      })
    })
    const topCats = Object.entries(catGrandTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c]) => c)

    const stacked = totalsByMonth.map(m => {
      const row = { key: m.key, label: m.label }
      let otherTotal = 0
      Object.entries(m.cats).forEach(([c, v]) => {
        if (topCats.includes(c)) row[c] = v
        else otherTotal += v
      })
      row.Other = otherTotal
      return row
    })

    return {
      rows: sorted,
      months: monthList,
      stackedData: stacked,
      topCategories: [...topCats, 'Other'],
      thisMonthTotal: Object.values(thisTotals).reduce((s, v) => s + v, 0),
      lastMonthTotal: Object.values(lastTotals).reduce((s, v) => s + v, 0)
    }
  }, [expenses, periodMonths])

  if (rows.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-sm">
        <EmptyState
          icon={Layers}
          title="No category data yet"
          message="Log some transactions to see category movement."
        />
      </div>
    )
  }

  const biggestChange = rows[0]
  const maxRowTotal = Math.max(...rows.map(r => Math.max(r.thisMonth, r.lastMonth)), 1)

  return (
    <div className="space-y-4">
      {/* Ranked change list */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-5 md:p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-800">Category Movement</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            <strong>{biggestChange.category}</strong> moved the most,{' '}
            {biggestChange.diff >= 0 ? 'up' : 'down'}{' '}
            <strong>{formatMYR(Math.abs(biggestChange.diff))}</strong> vs last month.
          </p>
        </div>

        <div className="space-y-2">
          {rows.slice(0, 8).map(row => {
            const isExpanded = expandedCat === row.category
            const up = row.diff > 0
            const neutral = Math.abs(row.diff) < 1
            const share = (row.thisMonth / Math.max(1, thisMonthTotal)) * 100

            return (
              <div key={row.category}>
                <button
                  onClick={() => setExpandedCat(prev => (prev === row.category ? null : row.category))}
                  className="w-full text-left relative overflow-hidden rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-all p-3"
                >
                  {/* Share bar behind */}
                  <div
                    className="absolute inset-y-0 left-0 bg-slate-50 pointer-events-none"
                    style={{ width: `${share}%` }}
                  />

                  <div className="relative flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {row.category}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatMYR(row.thisMonth)} this month
                        {row.isNew && <span className="ml-1 text-blue-500 font-bold">· New</span>}
                        {row.dropped && <span className="ml-1 text-slate-400 font-bold">· None this month</span>}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {!neutral && (
                        <div className={`flex items-center gap-0.5 text-xs font-black ${
                          up ? 'text-red-500' : 'text-emerald-500'
                        }`}>
                          {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {formatMYR(Math.abs(row.diff))}
                        </div>
                      )}
                      {neutral && <Minus className="w-3.5 h-3.5 text-slate-300" />}
                    </div>
                  </div>
                </button>

                {isExpanded && row.txns.length > 0 && (
                  <div className="mt-1.5 ml-3 pl-3 border-l-2 border-slate-100 space-y-1 animate-fadeIn">
                    {[...row.txns]
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, 3)
                      .map(tx => (
                        <div key={tx.id} className="flex justify-between text-[11px] py-1">
                          <span className="text-slate-500 truncate pr-2">{tx.description}</span>
                          <span className="text-slate-700 font-bold shrink-0">{formatMYR(tx.amount)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stacked monthly bars */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-5 md:p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Category Mix Over Time</h3>

        <div className="flex items-end gap-2 h-40">
          {stackedData.map(m => {
            const total = Object.entries(m)
              .filter(([k]) => !['key', 'label'].includes(k))
              .reduce((s, [, v]) => s + v, 0)
            if (total === 0) return (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full h-2 rounded-t bg-slate-100" />
                <span className="text-[10px] font-bold text-slate-400">{m.label}</span>
              </div>
            )

            const segments = topCategories
              .filter(c => m[c] > 0)
              .map((c, i) => ({
                name: c,
                value: m[c],
                pct: (m[c] / total) * 100,
                color: c === 'Other' ? COLORS.neutral : CATEGORY_COLORS[i % CATEGORY_COLORS.length]
              }))

            return (
              <button
                key={m.key}
                onClick={() => setSelectedMonthKey(prev => (prev === m.key ? null : m.key))}
                className="flex-1 flex flex-col items-center gap-1 group"
              >
                <div className="w-full h-32 flex flex-col-reverse rounded-t overflow-hidden">
                  {segments.map((s, i) => (
                    <div
                      key={i}
                      style={{ height: `${s.pct}%`, backgroundColor: s.color }}
                      className="w-full"
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-slate-500">{m.label}</span>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-3">
          {topCategories.map((c, i) => (
            <div key={c} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded"
                style={{ backgroundColor: c === 'Other' ? COLORS.neutral : CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
              />
              <span className="text-[10px] font-semibold text-slate-500">{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}