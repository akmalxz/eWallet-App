// src/components/wealth/AssetGrowthBreakdown.jsx
import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, ArrowDownRight, ArrowUpRight, Info } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatMYR } from '../../utils/formatters'

export const AssetGrowthBreakdown = ({ user, account, hideMoney }) => {
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.id || !account?.id) return
    let cancelled = false

    const fetchTxns = async () => {
      setLoading(true)
      const { data, error: fetchErr } = await supabase
        .from('transactions')
        .select('amount, source_account_id, destination_account_id')
        .eq('user_id', user.id)
        .or(`source_account_id.eq.${account.id},destination_account_id.eq.${account.id}`)
        .limit(2000)

      if (cancelled) return
      if (fetchErr) {
        setError(fetchErr.message)
        setLoading(false)
        return
      }
      setTxns(data || [])
      setLoading(false)
    }

    fetchTxns()
    return () => { cancelled = true }
  }, [user?.id, account?.id])

  const { contributions, withdrawals, growth } = useMemo(() => {
    let contributions = 0
    let withdrawals = 0
    for (const tx of txns) {
      const amt = Number(tx.amount) || 0
      if (tx.destination_account_id === account.id) contributions += amt
      if (tx.source_account_id === account.id) withdrawals += amt
    }
    const starting = Number(account.starting_balance) || 0
    const current = Number(account.balance) || 0
    const growth = current - starting - contributions + withdrawals
    return { contributions, withdrawals, growth }
  }, [txns, account])

  if (loading || error) return null
  if (contributions === 0 && withdrawals === 0 && (Number(account.starting_balance) || 0) === 0) {
    return null
  }

  return (
    <section className="bg-surface border border-line rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-line bg-surface-2/30">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-500" />
          <p className="text-sm font-bold text-fg">Dividend breakdown</p>
        </div>
        <p className="text-[11px] text-fg-muted mt-0.5">
          {account.account_name} · inferred from transactions
        </p>
      </div>

      <div className="divide-y divide-line">
        <Row
          label="Opening balance"
          icon={ArrowUpRight}
          value={Number(account.starting_balance) || 0}
          hideMoney={hideMoney}
          muted
        />
        <Row
          label="Money in"
          icon={ArrowUpRight}
          value={contributions}
          hideMoney={hideMoney}
          positive
        />
        {withdrawals > 0 && (
          <Row
            label="Money out"
            icon={ArrowDownRight}
            value={-withdrawals}
            hideMoney={hideMoney}
            negative
          />
        )}
        <Row
          label="Dividends earned"
          icon={TrendingUp}
          value={growth}
          hideMoney={hideMoney}
          positive={growth > 0}
          negative={growth < 0}
        />
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-2/60">
          <p className="text-[11px] font-bold text-fg-muted uppercase tracking-wider">
            Current balance
          </p>
          <p className="text-sm font-black text-fg tabular-figures">
            {hideMoney ? '••••' : formatMYR(Number(account.balance) || 0)}
          </p>
        </div>
      </div>

      <div className="px-4 py-2.5 bg-surface-2/30 border-t border-line flex items-start gap-2">
        <Info className="w-3 h-3 text-fg-subtle shrink-0 mt-0.5" />
        <p className="text-[10px] text-fg-subtle leading-relaxed">
          Assumes a fixed RM 1.00/unit price. Actual dividends may differ if
          withdrawals occurred between dividend cycles.
        </p>
      </div>
    </section>
  )
}

const Row = ({ label, icon: Icon, value, hideMoney, muted, positive, negative }) => {
  const colour = muted
    ? 'text-fg-muted'
    : negative
      ? 'text-danger'
      : positive
        ? 'text-success'
        : 'text-fg'

  const prefix = value > 0 && (positive || label === 'Money in') ? '+' : ''
  const display = hideMoney
    ? '••••'
    : `${value < 0 ? '−' : prefix}${formatMYR(Math.abs(value))}`

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${colour}`} />
        <p className="text-xs font-semibold text-fg-muted truncate">{label}</p>
      </div>
      <p className={`text-sm font-bold tabular-figures shrink-0 ${colour}`}>
        {display}
      </p>
    </div>
  )
}