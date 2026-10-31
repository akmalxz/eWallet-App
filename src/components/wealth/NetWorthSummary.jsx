// src/components/wealth/NetWorthSummary.jsx
import { useMemo, useState } from 'react'
import {
  Landmark, Wallet, Activity, PiggyBank, TrendingUp, Compass,
  BarChart3, CreditCard, ChevronDown
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

const CLASS_META = {
  hub:            { icon: Landmark,   label: 'Main Hub',      kind: 'asset' },
  ewallet:        { icon: Wallet,     label: 'Daily eWallet', kind: 'asset' },
  digital_bank:   { icon: Activity,   label: 'Digital Bank',  kind: 'asset' },
  savings:        { icon: PiggyBank,  label: 'Savings',       kind: 'asset' },
  fixed_price_ut: { icon: TrendingUp, label: 'ASB / ASM',     kind: 'asset' },
  pilgrimage:     { icon: Compass,    label: 'Tabung Haji',   kind: 'asset' },
  investment:     { icon: BarChart3,  label: 'Investment',    kind: 'asset' },
  credit:         { icon: CreditCard, label: 'Credit Card',   kind: 'liability' }
}

export const NetWorthSummary = ({ accounts = [], hideMoney = false }) => {
  const [expandedKey, setExpandedKey] = useState(null)

  const active = useMemo(
    () => accounts.filter(a => !a.is_archived),
    [accounts]
  )

  const { assets, liabilities, netWorth } = useMemo(() => {
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
      ...(CLASS_META[key] || { icon: Landmark, label: key, kind: 'asset' })
    }))

    const assets = groups.filter(g => g.kind === 'asset').sort((a, b) => b.total - a.total)
    const liabilities = groups.filter(g => g.kind === 'liability').sort((a, b) => a.total - b.total)
    const totalAssets = assets.reduce((s, g) => s + g.total, 0)
    const totalLiabilities = liabilities.reduce((s, g) => s + g.total, 0)
    const netWorth = totalAssets + totalLiabilities

    return { assets, liabilities, netWorth }
  }, [active])

  if (active.length === 0) return null

  const renderGroup = (g) => {
    const Icon = g.icon
    const isOpen = expandedKey === g.key
    const owed = g.kind === 'liability' && g.total < 0

    return (
      <div key={g.key}>
        <button
          type="button"
          onClick={() => setExpandedKey(isOpen ? null : g.key)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2 transition-colors text-left"
          style={{ minHeight: 56 }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              owed ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-fg-muted'
            }`}>
              <Icon className="w-4 h-4" />
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
        </button>

        {isOpen && (
          <div className="bg-surface-2/30 border-t border-line divide-y divide-line/50">
            {g.accounts.map(acc => (
              <div
                key={acc.id}
                className="flex items-center justify-between gap-3 pl-12 pr-4 py-2.5"
              >
                <p className="text-xs font-semibold text-fg-muted truncate">
                  {acc.account_name}
                </p>
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
    <section className="bg-surface border border-line rounded-2xl overflow-hidden">
      <div className="divide-y divide-line">
        {assets.map(renderGroup)}
      </div>

      {liabilities.length > 0 && (
        <>
          <div className="px-4 py-2 bg-surface-2/40 border-y border-line">
            <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
              Liabilities
            </p>
          </div>
          <div className="divide-y divide-line">
            {liabilities.map(renderGroup)}
          </div>
        </>
      )}
    </section>
  )
}