// src/components/wealth/SavingsRateCard.jsx
import { TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

export const SavingsRateCard = ({
  data,
  hideMoney = false,
  onLogIncome // Optional: pass this from WealthPage if you want the button to work
}) => {
  const { current, previous, trendPctPoints, hasIncome } = data

  // ---------- GHOST STATE: No income logged ----------
  if (!hasIncome) {
    return (
      <section className="space-y-4">
        <div className="px-1 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-fg">Savings rate</h2>
            <p className="text-xs text-fg-subtle mt-0.5">This cycle</p>
          </div>
        </div>

        <div className="px-1">
          <div className="flex items-end gap-3 mb-2.5">
            <p className="text-5xl font-black tracking-tighter tabular-figures text-fg-subtle/30">
              —%
            </p>
          </div>
          
          <div className="h-2.5 w-full bg-surface-2/50 rounded-full overflow-hidden">
            {/* Empty track, maybe with a faint dashed pattern or just plain */}
          </div>
        </div>

        <div className="px-1 mt-2 flex flex-col items-start gap-3">
          <p className="text-xs text-fg-muted leading-relaxed">
            No income logged this cycle. Log an income transaction to calculate your savings rate.
          </p>
          
          {/* If you pass onLogIncome, show a subtle button */}
          {onLogIncome && (
            <button
              onClick={onLogIncome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-fg bg-surface-2 hover:bg-surface-3 border border-line transition-colors"
              style={{ minHeight: 36 }}
            >
              <Plus className="w-3.5 h-3.5" /> Log Income
            </button>
          )}
        </div>
      </section>
    )
  }

  // ---------- ACTIVE STATE ----------
  const rate = current.rate || 0
  const rateDisplay = rate === null ? '—' : `${Math.round(rate)}%`
  
  const isNegative = rate < 0
  const isGood = rate >= 20
  const rateColour = isNegative ? 'text-danger' : isGood ? 'text-success' : 'text-warning'
  const barColour = isNegative ? 'bg-danger' : isGood ? 'bg-success' : 'bg-warning'
  const bgTrackColour = 'bg-surface-2'

  const trendUp = trendPctPoints !== null && trendPctPoints > 0.5
  const trendDown = trendPctPoints !== null && trendPctPoints < -0.5
  const TrendIcon = trendUp ? TrendingUp : trendDown ? TrendingDown : Minus
  const trendColour = trendUp ? 'text-success' : trendDown ? 'text-danger' : 'text-fg-subtle'
  
  const savingsPositive = current.savings >= 0
  const visualBarWidth = Math.max(0, Math.min(100, rate))

  return (
    <section className="space-y-4">
      {/* HEADER */}
      <div className="px-1 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-fg">Savings rate</h2>
          <p className="text-xs text-fg-subtle mt-0.5">This cycle</p>
        </div>
        {trendPctPoints !== null && previous.rate !== null && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold mt-1 ${trendColour}`}>
            <TrendIcon className="w-3 h-3" />
            {`${trendUp ? '+' : trendDown ? '−' : ''}${Math.abs(trendPctPoints).toFixed(0)}%`}
            <span className="text-fg-subtle font-medium">vs last cycle</span>
          </span>
        )}
      </div>

      {/* HERO NUMBER & PROGRESS BAR */}
      <div className="px-1">
        <div className="flex items-end gap-3 mb-2.5">
          <p className={`text-5xl font-black tracking-tighter tabular-figures ${rateColour}`}>
            {rateDisplay}
          </p>
        </div>
        
        <div className={`h-2.5 w-full ${bgTrackColour} rounded-full overflow-hidden`}>
          <div
            className={`h-full rounded-full transition-all duration-1000 ${barColour}`}
            style={{ width: `${visualBarWidth}%` }}
          />
        </div>
      </div>

      {/* BREAKDOWN TEXT */}
      <div className="px-1 space-y-2 mt-2">
        <p className="text-xs text-fg-muted leading-relaxed">
          {hideMoney ? (
            savingsPositive ? (
              <>You kept a portion of this cycle&rsquo;s income.</>
            ) : (
              <>You spent more than you earned this cycle.</>
            )
          ) : savingsPositive ? (
            <>
              You kept{' '}
              <strong className="text-fg font-bold tabular-figures">
                {formatMYR(current.savings)}
              </strong>{' '}
              of{' '}
              <strong className="text-fg font-bold tabular-figures">
                {formatMYR(current.income)}
              </strong>{' '}
              income.
            </>
          ) : (
            <>
              You spent{' '}
              <strong className="text-danger font-bold tabular-figures">
                {formatMYR(-current.savings)}
              </strong>{' '}
              more than your{' '}
              <strong className="text-fg font-bold tabular-figures">
                {formatMYR(current.income)}
              </strong>{' '}
              income.
            </>
          )}
        </p>

        {current.wealthContribution > 0 && (
          <p className="text-xs text-fg-muted leading-relaxed flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
            {hideMoney ? (
              <>Some of it went to savings accounts.</>
            ) : (
              <>
                <span className="text-sky-500 font-bold tabular-figures">
                  {formatMYR(current.wealthContribution)}
                </span>{' '}
                went into savings accounts (ASB / Tabung Haji).
              </>
            )}
          </p>
        )}
      </div>
      
      {/* FOOTNOTE */}
      <div className="px-1 pt-1">
        <p className="text-[10px] text-fg-subtle leading-relaxed">
          Transfers to your own accounts don&rsquo;t count as spending.
        </p>
      </div>
    </section>
  )
}