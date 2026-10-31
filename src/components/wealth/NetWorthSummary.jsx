// src/components/wealth/NetWorthSummary.jsx
import { useMemo, useState } from 'react'
import {
  Landmark, Wallet, Activity, PiggyBank, TrendingUp, Compass,
  BarChart3, CreditCard, ChevronDown
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

const CLASS_META = {
  hub:            { icon: Landmark,   label: 'Main Hub',      kind: 'asset',     color: 'text-blue-500' },
  ewallet:        { icon: Wallet,     label: 'Daily eWallet', kind: 'asset',     color: 'text-purple-500' },
  digital_bank:   { icon: Activity,   label: 'Digital Bank',  kind: 'asset',     color: 'text-emerald-500' },
  savings:        { icon: PiggyBank,  label: 'Savings',       kind: 'asset',     color: 'text-amber-500' },
  fixed_price_ut: { icon: TrendingUp, label: 'ASB / ASM',     kind: 'asset',     color: 'text-sky-500' },
  pilgrimage:     { icon: Compass,    label: 'Tabung Haji',   kind: 'asset',     color: 'text-teal-500' },
  investment:     { icon: BarChart3,  label: 'Investment',    kind: 'asset',     color: 'text-violet-500' },
  credit:         { icon: CreditCard, label: 'Credit Card',   kind: 'liability', color: 'text-rose-500' }
}

export const NetWorthSummary = ({ accounts = [], hideMoney = false }) => {
  const [expandedKey, setExpandedKey] = useState(null)

  const active = useMemo(
    () => accounts.filter(a => !a.is_archived),
    [accounts]
  )

  const { assets, liabilities, totalAssets, totalLiabilities } = useMemo(() => {
    const byClass = new Map()
    for (const acc of active) {
      const key = acc.classification || 'hub'
      const existing = byClass.get(key) || { total: 0, accounts: [] }
      existing.total += Number(acc.balance) || 0
      existing.accounts.push(acc)
      byClass.set(key, existing)
    }

    const groups = [...byClass.entries()].map(([key, { total, accounts }]) => ({
      key,
      total,
      accounts: accounts.sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0)),
      count: accounts.length,
      ...(CLASS_META[key] || { icon: Landmark, label: key, kind: 'asset', color: 'text-fg-subtle' })
    }))

    const assets = groups.filter(g => g.kind === 'asset').sort((a, b) => b.total - a.total)
    const liabilities = groups.filter(g => g.kind === 'liability').sort((a, b) => a.total - b.total)
    
    const totalAssets = assets.reduce((s, g) => s + g.total, 0)
    const totalLiabilities = Math.abs(liabilities.reduce((s, g) => s + g.total, 0))

    return { assets, liabilities, totalAssets, totalLiabilities }
  }, [active])

  if (active.length === 0) return null

  const renderGroup = (g) => {
    const Icon = g.icon
    const isOpen = expandedKey === g.key
    const owed = g.kind === 'liability' && g.total < 0
    
    const denominator = g.kind === 'asset' ? totalAssets : totalLiabilities
    const pct = denominator > 0 ? (Math.abs(g.total) / denominator) * 100 : 0

    return (
      <div key={g.key} className="relative flex flex-col mb-2">
        {/* THE MAIN ROW (acts as the rounded container) */}
        <button
          type="button"
          onClick={() => setExpandedKey(isOpen ? null : g.key)}
          className={`w-full flex flex-col text-left transition-all duration-200 rounded-2xl ${
            isOpen 
              ? 'bg-surface-2/40 rounded-b-none' // Flat bottom when open to connect with list
              : 'hover:bg-surface-2/40'          // Fully rounded hover when closed
          }`}
        >
          <div className="flex items-center justify-between gap-3 px-3.5 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-6 flex items-center justify-center shrink-0">
                <Icon className={`w-5 h-5 ${g.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-fg truncate">{g.label}</p>
                <p className="text-[11px] text-fg-subtle tabular-figures">
                  {g.count} {g.count === 1 ? 'account' : 'accounts'}
                  {g.kind === 'liability' && (owed ? ' owed' : ' in credit')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <p className={`text-sm font-black tabular-figures ${
                owed ? 'text-danger' : g.kind === 'liability' ? 'text-success' : 'text-fg'
              }`}>
                {hideMoney
                  ? '••••'
                  : owed
                    ? `− ${formatMYR(Math.abs(g.total))}`
                    : g.kind === 'liability'
                      ? `+ ${formatMYR(g.total)}`
                      : formatMYR(g.total)
                }
              </p>
              <ChevronDown className={`w-4 h-4 text-fg-subtle transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {/* THE BORDER AS DATA VIZ (Inside the button so hover wraps around it) */}
          <div className="px-3.5 pb-3">
            <div className="h-1.5 w-full bg-surface-2/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  owed ? 'bg-danger' : g.kind === 'liability' ? 'bg-success' : 'bg-brand'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </button>

        {/* EXPANDED DRILLDOWN (Transparent background, sits cleanly below) */}
        {isOpen && (
          <div className="pt-1 pb-1">
            {g.accounts.map(acc => (
              <div
                key={acc.id}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${g.color.replace('text-', 'bg-')}`} />
                  <p className="text-xs font-semibold text-fg-muted truncate">
                    {acc.account_name}
                  </p>
                </div>
                <p className={`text-xs font-bold tabular-figures shrink-0 ${
                  (Number(acc.balance) || 0) < 0 ? 'text-danger' : 'text-fg'
                }`}>
                  {hideMoney ? '••••' : formatMYR(Number(acc.balance) || 0)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ASSETS LIST */}
      <div className="flex flex-col">
        {assets.map(renderGroup)}
      </div>

      {/* LIABILITIES LIST */}
      {liabilities.length > 0 && (
        <div className="pt-2">
          <p className="px-2 pb-1 text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
            Liabilities
          </p>
          <div className="flex flex-col">
            {liabilities.map(renderGroup)}
          </div>
        </div>
      )}
    </div>
  )
}