// src/components/analytics/TopCategories.jsx
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { useChartTheme } from '../../hooks/useChartTheme'

export const TopCategories = ({ expenses, accounts = [] }) => {
  const theme = useChartTheme()
  const [expandedMain, setExpandedMain] = useState(null)
  const [expandedSub, setExpandedSub] = useState(null)

  const { topCategories, total } = useMemo(() => {
    const map = new Map()
    let all = 0

    expenses.forEach((tx) => {
      const parts = (tx.category || 'Uncategorized').split(' > ')
      const main = parts[0].trim()
      const sub = parts.length > 1 ? parts[1].trim() : 'General'
      const amt = Number(tx.amount) || 0

      all += amt

      // Set up Main Category
      if (!map.has(main)) map.set(main, { total: 0, subs: new Map() })
      const mainObj = map.get(main)
      mainObj.total += amt

      // Set up Sub Category
      if (!mainObj.subs.has(sub)) mainObj.subs.set(sub, { total: 0, txns: [] })
      const subObj = mainObj.subs.get(sub)
      subObj.total += amt
      subObj.txns.push(tx)
    })

    // Sort and format
    const sorted = Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        subs: Array.from(data.subs.entries())
          .map(([subName, subData]) => ({ name: subName, ...subData }))
          .sort((a, b) => b.total - a.total)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6) // Top 6 main categories

    return { topCategories: sorted, total: all }
  }, [expenses])

  if (total <= 0) return null

  const toggleMain = (name) => {
    setExpandedMain((prev) => (prev === name ? null : name))
    setExpandedSub(null) // Close sub if changing main
  }

  const toggleSub = (name) => {
    setExpandedSub((prev) => (prev === name ? null : name))
  }

  return (
    <section className="space-y-4 mt-8">
      <div>
        <h3 className="text-sm font-bold text-fg">Where Your Money Went</h3>
        <p className="text-xs text-fg-muted mt-0.5">
          Ranked by total spend. Tap a category to see the breakdown.
        </p>
      </div>

      <div className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
        {topCategories.map((cat, i) => {
          const pct = (cat.total / total) * 100
          const isExpanded = expandedMain === cat.name
          const mainColor = i === 0 ? theme.current : theme.category[i % theme.category.length]

          return (
            <div key={cat.name}>
              {/* Main Category Row */}
              <button
                onClick={() => toggleMain(cat.name)}
                className="w-full text-left px-4 py-3.5 hover:bg-surface-2 transition-colors flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs items-end mb-1.5">
                    <span className="font-bold text-fg truncate pr-2">{cat.name}</span>
                    <span className="font-black text-fg tabular-figures shrink-0">
                      {formatMYR(cat.total)}
                    </span>
                  </div>
                  <div className="relative h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.max(2, pct)}%`,
                        backgroundColor: mainColor
                      }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-fg-subtle">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Sub Categories Accordion */}
              {isExpanded && (
                <div className="bg-surface-2/30 border-t border-line divide-y divide-line/50">
                  {cat.subs.map((sub) => {
                    const isSubExpanded = expandedSub === sub.name
                    const subPct = (sub.total / cat.total) * 100

                    return (
                      <div key={sub.name}>
                        <button
                          onClick={() => toggleSub(sub.name)}
                          className="w-full flex items-center justify-between px-4 py-2.5 pl-8 hover:bg-surface-2 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown className={`w-3.5 h-3.5 text-fg-subtle transition-transform ${isSubExpanded ? 'rotate-180' : ''}`} />
                            <span className="text-xs font-bold text-fg">{sub.name}</span>
                            <span className="text-[10px] font-bold text-fg-subtle bg-surface-2 px-1.5 py-0.5 rounded">
                              {subPct.toFixed(0)}%
                            </span>
                          </div>
                          <span className="text-xs font-bold text-fg tabular-figures">
                            {formatMYR(sub.total)}
                          </span>
                        </button>

                        {/* Transactions inside Sub Category */}
                        {isSubExpanded && (
                          <div className="bg-surface border-t border-line/50 divide-y divide-line/50">
                            {sub.txns.map((tx) => {
                              const account = accounts.find((a) => a.id === tx.source_account_id)
                              return (
                                <div key={tx.id} className="flex items-center justify-between px-4 py-2 pl-14">
                                  <div className="min-w-0 pr-2">
                                    <p className="text-xs font-bold text-fg truncate">
                                      {tx.description || 'Untitled'}
                                    </p>
                                    <p className="text-[10px] text-fg-subtle">
                                      {new Date(tx.transaction_date).toLocaleDateString('en-MY', {
                                        day: 'numeric',
                                        month: 'short'
                                      })}
                                      {account && ` · ${account.account_name}`}
                                    </p>
                                  </div>
                                  <span className="text-xs font-black text-fg shrink-0 tabular-figures">
                                    {formatMYR(tx.amount)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}