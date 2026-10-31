// src/components/wealth/WealthInfo.jsx
import { useState } from 'react'
import { Info, X } from 'lucide-react'

const PAGE_INFO = {
  title: 'About Wealth',
  summary: "Track what you own and how fast you're building it.",
  points: [
    {
      heading: 'Net worth',
      text: 'Total assets minus liabilities across every account. Includes cash, savings, ASB, and Tabung Haji.'
    },
    {
      heading: 'History',
      text: 'Each point is your net worth at a month boundary, computed from opening balances and every transaction since.'
    },
    {
      heading: 'Savings rate',
      text: "How much of this cycle's income you kept. Transfers to your own accounts don't count as spending."
    },
    {
      heading: 'Dividend breakdown',
      text: 'For ASB / ASM only: money in, money out, and implied dividends, assuming a fixed RM 1.00 per unit.'
    }
  ]
}

export const WealthInfo = () => {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-fg-subtle hover:text-fg transition-colors rounded-lg px-1"
        style={{ minHeight: 32 }}
      >
        <Info className="w-3.5 h-3.5" />
        {open ? 'Hide explanation' : 'What is this page?'}
      </button>

      {open && (
        <div className="mt-2 bg-surface-2 border border-line rounded-xl p-4 animate-fadeIn">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-bold text-fg">{PAGE_INFO.title}</p>
              <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">{PAGE_INFO.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface transition-colors"
              aria-label="Close explanation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-2.5">
            {PAGE_INFO.points.map((p) => (
              <li key={p.heading} className="text-xs text-fg-muted leading-relaxed">
                <strong className="text-fg font-semibold">{p.heading}.</strong> {p.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}