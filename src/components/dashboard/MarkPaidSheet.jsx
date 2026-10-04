// src/components/dashboard/MarkPaidSheet.jsx
import { useState } from 'react'
import { Check, AlertCircle, AlertTriangle } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'
import { dayKey, monthFullName, toMYDate } from '../../utils/dateHelpers'
import { Sheet } from '../shared/Sheet'

export const MarkPaidSheet = ({
  commitment,
  period,
  accounts = [],
  onConfirm,
  onCancel,
  saving = false,
  error = null
}) => {
  const todayKeyNow = dayKey(new Date())

  const [amount, setAmount] = useState(
    commitment?.amount != null ? String(commitment.amount) : ''
  )
  const [paidDate, setPaidDate] = useState(todayKeyNow)
  const [localError, setLocalError] = useState(null)

  const account = accounts.find((a) => a.id === commitment?.account_id)
  const accountName = account?.account_name || 'Unknown account'
  const accountBalance = Number(account?.balance) || 0

  const amountNum = parseFloat(amount)
  const amountValid = !isNaN(amountNum) && amountNum > 0
  const amountChanged = amountNum !== Number(commitment?.amount)

  const periodLabel = period
    ? monthFullName(new Date(Date.UTC(period.year, period.month - 1, 1)))
    : null

  const paidMY = paidDate ? toMYDate(new Date(`${paidDate}T12:00:00+08:00`)) : null
  const nowMY = toMYDate(new Date())
  const isDifferentMonth =
    paidMY &&
    (paidMY.getUTCFullYear() !== nowMY.getUTCFullYear() ||
      paidMY.getUTCMonth() !== nowMY.getUTCMonth())

  const wouldGoNegative = amountValid && account && accountBalance - amountNum < 0

  const displayError = error || localError
  const hasChanges =
    amount !== String(commitment?.amount) || paidDate !== todayKeyNow

  const handleConfirm = async () => {
    setLocalError(null)

    if (!amountValid) {
      setLocalError('Please enter a valid amount greater than 0')
      return
    }

    const currentNow = dayKey(new Date())
    if (paidDate > currentNow) {
      setLocalError('The paid date cannot be in the future')
      return
    }

    await onConfirm({
      periodYear: period?.year,
      periodMonth: period?.month,
      amount: amountNum,
      paidDate
    })
  }

  return (
    <Sheet
      title="Mark as paid"
      onClose={onCancel}
      saving={saving}
      hasUnsavedChanges={hasChanges}
    >
      {periodLabel && (
        <p className="text-xs text-fg-muted">
          For <strong className="text-fg">{periodLabel}</strong>
        </p>
      )}

      <div className="bg-surface-2 border border-line rounded-xl p-3.5">
        <p className="text-sm font-bold text-fg truncate">{commitment?.name}</p>
        <p className="text-xs text-fg-muted mt-0.5 truncate">From {accountName}</p>
      </div>

      <div>
        <label
          htmlFor="mark-paid-amount"
          className="block text-[11px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5"
        >
          Amount
        </label>
        <input
          id="mark-paid-amount"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            if (localError) setLocalError(null)
          }}
          autoFocus
          disabled={saving}
          className={`w-full bg-surface border rounded-xl py-3 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition-all disabled:bg-surface-2 disabled:opacity-70 ${
            amountValid ? 'border-line focus:border-brand' : 'border-danger-border focus:border-danger'
          }`}
        />
        {amountChanged && amountValid && (
          <p className="text-[11px] text-fg-muted mt-1">
            Original: {formatMYR(commitment.amount)} · Override applied
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="mark-paid-date"
          className="block text-[11px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5"
        >
          Paid on
        </label>
        <input
          id="mark-paid-date"
          type="date"
          value={paidDate}
          max={todayKeyNow}
          onChange={(e) => {
            setPaidDate(e.target.value)
            if (localError) setLocalError(null)
          }}
          disabled={saving}
          className="w-full bg-surface border border-line rounded-xl py-3 px-3 text-sm text-fg outline-none focus:border-brand disabled:bg-surface-2 disabled:opacity-70"
        />
        {isDifferentMonth && (
          <p className="mt-1.5 text-[11px] text-fg-muted">
            This will count towards{' '}
            <strong className="text-fg">
              {monthFullName(new Date(`${paidDate}T12:00:00+08:00`))}
            </strong>
            .
          </p>
        )}
      </div>

      {wouldGoNegative && (
        <div className="bg-warning-soft border border-warning-border rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-warning-text leading-relaxed">
            This will take <strong>{accountName}</strong> below zero (balance{' '}
            {formatMYR(accountBalance)}, payment {formatMYR(amountNum)}).
          </p>
        </div>
      )}

      {displayError && (
        <div className="bg-danger-soft border border-danger-border rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-xs text-danger-text font-medium leading-relaxed">{displayError}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-fg-muted hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: 44 }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving || !amountValid}
          className="flex-1 py-3 rounded-xl text-sm font-bold bg-success-solid hover:bg-success-solid-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ minHeight: 44 }}
        >
          {saving ? 'Saving…' : (<><Check className="w-4 h-4" /> Paid</>)}
        </button>
      </div>
    </Sheet>
  )
}