// src/components/dashboard/MarkPaidSheet.jsx
import { useState } from 'react'
import { Check } from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

export const MarkPaidSheet = ({
  commitment,
  accounts = [],
  onConfirm,
  onCancel,
  saving = false
}) => {
  const [amount, setAmount] = useState(
    commitment?.amount != null ? String(commitment.amount) : ''
  )
  const [paidDate, setPaidDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  )

  const accountName =
    accounts.find(a => a.id === commitment?.account_id)?.account_name || 'Unknown account'

  const amountNum = parseFloat(amount)
  const amountValid = !isNaN(amountNum) && amountNum > 0
  const amountChanged = amountNum !== Number(commitment?.amount)

  const handleConfirm = () => {
    if (!amountValid) return
    onConfirm({ amount: amountNum, paidDate })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="p-5 md:p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Mark as paid</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Records an expense from this account.
            </p>
          </div>

          {/* Commitment summary */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
            <p className="text-sm font-bold text-slate-800 truncate">
              {commitment?.name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              From {accountName}
            </p>
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="mark-paid-amount"
              className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
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
              onChange={e => setAmount(e.target.value)}
              autoFocus
              className={`w-full bg-white border rounded-xl py-3 px-3 text-sm outline-none transition-all ${
                amountValid ? 'border-slate-200 focus:border-blue-500' : 'border-red-300 focus:border-red-500'
              }`}
            />
            {amountChanged && amountValid && (
              <p className="text-[11px] text-slate-500 mt-1">
                Original: {formatMYR(commitment.amount)} · Override applied
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="mark-paid-date"
              className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
            >
              Paid on
            </label>
            <input
              id="mark-paid-date"
              type="date"
              value={paidDate}
              onChange={e => setPaidDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              style={{ minHeight: 44 }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || !amountValid}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ minHeight: 44 }}
            >
              {saving ? (
                'Saving…'
              ) : (
                <>
                  <Check className="w-4 h-4" /> Mark as paid
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}