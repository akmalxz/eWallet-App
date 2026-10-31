// src/components/wealth/AssetGrowthBreakdown.jsx
import { useState, useEffect, useMemo } from 'react'
import { ArrowDownRight, ArrowUpRight, TrendingUp, Info } from 'lucide-react'
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

  const { contributions, withdrawals, growth, currentBalance, startingBalance } = useMemo(() => {
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
    return { 
      contributions, 
      withdrawals, 
      growth, 
      currentBalance: current, 
      startingBalance: starting 
    }
  }, [txns, account])

  if (loading || error) return null
  if (contributions === 0 && withdrawals === 0 && startingBalance === 0) {
    return null
  }

  // Calculate percentages for the stacked composition bar
  // Only render percentages if current balance is positive to avoid weird negative bars
  const safeTotal = currentBalance > 0 ? currentBalance : 1
  const pctOpening = Math.max(0, (startingBalance / safeTotal) * 100)
  const pctIn = Math.max(0, (contributions / safeTotal) * 100)
  const pctDiv = Math.max(0, (growth / safeTotal) * 100)

  return (
    <section className="space-y-4">
      {/* HEADER */}
      <div className="px-1">
        <h2 className="text-sm font-bold text-fg flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-500" />
          Dividend breakdown
        </h2>
        <p className="text-xs text-fg-subtle mt-0.5">
          {account.account_name} · inferred from transactions
        </p>
      </div>

      {/* MATHEMATICAL BREAKDOWN LIST */}
      <div className="flex flex-col px-1">
        <Row
          label="Opening balance"
          icon={ArrowUpRight}
          value={startingBalance}
          hideMoney={hideMoney}
          muted
        />
        <Row
          label="Money in"
          icon={ArrowUpRight}
          value={contributions}
          hideMoney={hideMoney}
          color="text-sky-500"
        />
        {withdrawals > 0 && (
          <Row
            label="Money out"
            icon={ArrowDownRight}
            value={-withdrawals}
            hideMoney={hideMoney}
            color="text-danger"
          />
        )}
        <Row
          label="Dividends earned"
          icon={TrendingUp}
          value={growth}
          hideMoney={hideMoney}
          color={growth >= 0 ? "text-success" : "text-danger"}
        />
        
        {/* FOOTER: CURRENT BALANCE */}
        <div className="flex items-center justify-between gap-3 py-3 mt-1 border-t border-line/60">
          <p className="text-xs font-bold text-fg-muted uppercase tracking-wider">
            Current balance
          </p>
          <p className="text-sm font-black text-fg tabular-figures">
            {hideMoney ? '••••' : formatMYR(currentBalance)}
          </p>
        </div>
      </div>

      {/* STACKED COMPOSITION BAR */}
      {!hideMoney && currentBalance > 0 && (
        <div className="px-1 pb-1 animate-fadeIn">
          <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-fg-subtle/40" 
              style={{ width: `${pctOpening}%` }} 
              title={`Opening: ${formatMYR(startingBalance)}`}
            />
            <div 
              className="h-full bg-sky-500" 
              style={{ width: `${pctIn}%` }} 
              title={`Money In: ${formatMYR(contributions)}`}
            />
            <div 
              className="h-full bg-success" 
              style={{ width: `${pctDiv}%` }} 
              title={`Dividends: ${formatMYR(growth)}`}
            />
          </div>
          
          {/* LEGEND */}
          <div className="flex items-center gap-4 mt-2.5">
            {startingBalance > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-fg-subtle/40" />
                <span className="text-[10px] font-bold text-fg-muted">Opening</span>
              </div>
            )}
            {contributions > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-sky-500" />
                <span className="text-[10px] font-bold text-fg-muted">Money in</span>
              </div>
            )}
            {growth > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-[10px] font-bold text-fg-muted">Dividends</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DISCLAIMER */}
      <div className="px-1 pt-1 flex items-start gap-1.5">
        <Info className="w-3 h-3 text-fg-subtle shrink-0 mt-0.5" />
        <p className="text-[10px] text-fg-subtle leading-relaxed">
          Assumes a fixed RM 1.00/unit price. Actual dividends may differ if
          withdrawals occurred between dividend cycles.
        </p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------
// ROW COMPONENT
// ---------------------------------------------------------
const Row = ({ label, icon: Icon, value, hideMoney, muted, color }) => {
  const textColour = muted 
    ? 'text-fg-muted' 
    : color || 'text-fg'

  const prefix = value > 0 && label === 'Money in' ? '+' : ''
  
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${textColour}`} />
        <p className="text-xs font-semibold text-fg-muted truncate">{label}</p>
      </div>
      <p className={`text-sm font-bold tabular-figures shrink-0 ${textColour}`}>
        {hideMoney
          ? '••••'
          : `${value < 0 ? '−' : prefix}${formatMYR(Math.abs(value))}`
        }
      </p>
    </div>
  )
}