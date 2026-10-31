// src/components/wealth/SavingsRateCard.jsx
import { TrendingUp, TrendingDown, Minus, ArrowRight, Wallet } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { EmptyState } from '../analytics/AnalyticsShared'

export const SavingsRateCard = ({
  data,
  hideMoney = false,
  onSeeTrends
}) => {
  const { current, previous, trendPctPoints, hasIncome } = data

  // ---------- Empty state: no income logged this cycle ----------
  if (!hasIncome) {
    return (
      <section className="relative bg-surface border border-line rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 rounded-full bg-line-strong" />
        <div className="p-5 pt-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-bold text-fg">Savings rate</h2>
              <p className="text-xs text-fg-subtle mt-0.5">This cycle</p>
            </div>
          </div>
          <EmptyState
            icon={Wallet}
            title="No income logged this cycle"
            message="Log an income transaction to see how much of it you're keeping."
            compact
          />
        </div>
      </section>
    )
  }

  const rate = current.rate
  const rateDisplay = rate === null ? '—' : `${rate.toFixed(0)}%`
  const rateColour =
    rate === null ? 'text-fg-subtle'
    : rate >= 20 ? 'text-success'
    : rate >= 0 ? 'text-warning'
    : 'text-danger'

  const accent =
    rate === null ? 'bg-line-strong'
    : rate >= 20 ? 'bg-success'
    : rate >= 0 ? 'bg-warning'
    : 'bg-danger'

  const trendUp = trendPctPoints !== null && trendPctPoints > 0.5
  const trendDown = trendPctPoints !== null && trendPctPoints < -0.5
  const TrendIcon = trendUp ? TrendingUp : trendDown ? TrendingDown : Minus
  const trendColour = trendUp ? 'text-success' : trendDown ? 'text-danger' : 'text-fg-subtle'

  const savingsPositive = current.savings >= 0

  return (
    <section className="relative bg-surface border border-line rounded-2xl overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-full ${accent}`} />

      <div className="p-5 pt-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-fg">Savings rate</h2>
            <p className="text-xs text-fg-subtle mt-0.5">This cycle</p>
          </div>
          {onSeeTrends && (
            <button
              onClick={() => onSeeTrends('income')}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-fg-muted hover:text-fg transition-colors shrink-0"
              style={{ minHeight: 32 }}
            >
              See trends <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Hero: rate % with trend */}
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className={`text-4xl font-black tracking-tighter tabular-figures ${rateColour}`}>
            {rateDisplay}
          </p>
          {trendPctPoints !== null && previous.rate !== null && (
            <span className={`inline-flex items-center gap-1 text-xs font-bold ${trendColour}`}>
              <TrendIcon className="w-3.5 h-3.5" />
              {previous.rate === null
                ? ''
                : `from ${previous.rate.toFixed(0)}% last cycle`
              }
            </span>
          )}
        </div>

        {/* Supporting line: kept amount of income */}
        <p className="text-xs text-fg-muted mt-2 leading-relaxed">
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

        {/* Wealth contribution sub-line */}
        {current.wealthContribution > 0 && (
          <p className="text-xs text-fg-muted mt-1 leading-relaxed">
            {hideMoney ? (
              <>Some of it went to savings accounts.</>
            ) : (
              <>
                <span className="text-sky-500 font-bold tabular-figures">
                  {formatMYR(current.wealthContribution)}
                </span>{' '}
                went into savings accounts (ASB / Tabung Haji / Investments).
              </>
            )}
          </p>
        )}

        {/* Footer note about exclusions */}
        <p className="text-[10px] text-fg-subtle mt-3 pt-3 border-t border-line/60 leading-relaxed">
          Transfers to your own accounts don&rsquo;t count as spending.
        </p>
      </div>
    </section>
  )
}