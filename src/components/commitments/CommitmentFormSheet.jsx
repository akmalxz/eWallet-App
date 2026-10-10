// src/components/commitments/CommitmentFormSheet.jsx
import { useState, useEffect, useRef } from 'react'
import { Save, AlertCircle, Wallet } from 'lucide-react'
import { Sheet } from '../shared/Sheet'
import { SlidingSegmentedControl } from '../shared/SlidingSegmentedControl'
import { formatMYR } from '../../utils/formatters'

const NAME_MAX = 40
const TERM_MAX = 360

const TYPE_ITEMS = [
  { id: 'recurring', label: 'Recurring' },
  { id: 'bnpl',      label: 'BNPL' }
]

// Turn a YYYY-MM-DD date string into just the day number (safe under
// any local timezone — we parse the string directly, never through Date).
const dayFromDateString = (dateStr) => {
  if (!dateStr) return null
  const parts = String(dateStr).slice(0, 10).split('-')
  const d = parseInt(parts[2], 10)
  return Number.isFinite(d) ? d : null
}

const todayDateString = () => {
  const n = new Date()
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const CommitmentFormSheet = ({
  commitment = null,
  accounts = [],
  allCommitments = [],
  saving = false,
  onSubmit,
  onCancel
}) => {
  const isEdit = !!commitment
  const nameRef = useRef(null)

  const initial = {
    name: commitment?.name || '',
    amount: commitment?.amount != null ? String(commitment.amount) : '',
    dueDay:
      commitment?.due_day_of_month != null ? String(commitment.due_day_of_month) : '',
    accountId: commitment?.account_id || accounts[0]?.id || '',
    kind: commitment?.kind || 'recurring',
    termMonths:
      commitment?.term_months != null ? String(commitment.term_months) : '',
    firstPaymentDate: commitment?.first_payment_date
      ? String(commitment.first_payment_date).slice(0, 10)
      : todayDateString()
  }

  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(initial)

  const account = accounts.find((a) => a.id === draft.accountId)
  const accountIsArchived = account?.is_archived === true
  const isBnpl = draft.kind === 'bnpl'

  const validate = () => {
    const next = {}
    const name = draft.name.trim()
    if (!name) next.name = 'Name is required'
    else if (name.length > NAME_MAX)
      next.name = `Name must be ${NAME_MAX} characters or less`
    else {
      const dupe = allCommitments.find(
        (c) => c.id !== commitment?.id && c.name.trim().toLowerCase() === name.toLowerCase()
      )
      if (dupe) next.name = `You already have a bill called "${dupe.name}"`
    }

    const amt = parseFloat(draft.amount)
    if (!draft.amount || isNaN(amt) || amt <= 0) {
      next.amount = 'Enter an amount greater than 0'
    }

    if (isBnpl) {
      // First payment date is required for BNPL.
      if (!draft.firstPaymentDate) {
        next.firstPaymentDate = 'Choose the first payment date'
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.firstPaymentDate)) {
        next.firstPaymentDate = 'Enter a valid date'
      }

      const term = parseInt(draft.termMonths, 10)
      if (!draft.termMonths || isNaN(term) || term < 1) {
        next.termMonths = 'Enter the number of instalments remaining'
      } else if (term > TERM_MAX) {
        next.termMonths = `Term must be ${TERM_MAX} instalments or less`
      }
    } else {
      // Recurring: due day is a plain 1–31 number.
      const day = parseInt(draft.dueDay, 10)
      if (!draft.dueDay || isNaN(day) || day < 1 || day > 31) {
        next.dueDay = 'Due day must be between 1 and 31'
      }
    }

    if (!draft.accountId) next.accountId = 'Choose an account'
    else if (accountIsArchived)
      next.accountId = 'This account is archived. Choose another.'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async () => {
    setServerError(null)
    if (!validate()) return

    // For BNPL, derive due_day_of_month from first_payment_date so the
    // two columns stay consistent. The engine uses first_payment_date
    // for scheduling, but keeping due_day in sync avoids confusion if
    // the row is ever viewed raw.
    let resolvedDueDay
    let resolvedFirstPaymentDate = null

    if (isBnpl) {
      const dayFromDate = dayFromDateString(draft.firstPaymentDate)
      resolvedDueDay = dayFromDate
      resolvedFirstPaymentDate = draft.firstPaymentDate
    } else {
      resolvedDueDay = parseInt(draft.dueDay, 10)
    }

    const payload = {
      name: draft.name.trim(),
      amount: parseFloat(draft.amount),
      due_day_of_month: resolvedDueDay,
      account_id: draft.accountId,
      kind: draft.kind,
      term_months: isBnpl ? parseInt(draft.termMonths, 10) : null,
      first_payment_date: resolvedFirstPaymentDate
    }

    const result = await onSubmit(payload, commitment)
    if (result && result.success === false) {
      setServerError(result.error || 'Could not save. Please try again.')
    }
  }

  const setField = (field) => (e) => {
    setDraft((d) => ({ ...d, [field]: e.target.value }))
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }))
  }

  const setKind = (next) => {
    setDraft((d) => {
      if (next === 'recurring') {
        // Clear BNPL-only fields when switching back.
        return { ...d, kind: next, termMonths: '' }
      }
      // Seed the date input with today so the user has a starting point.
      return {
        ...d,
        kind: next,
        firstPaymentDate: d.firstPaymentDate || todayDateString()
      }
    })
    setErrors({})
  }

  // ------------------------------------------------------------
  // Empty state — can't add a bill without an active account.
  // ------------------------------------------------------------
  const activeAccounts = accounts.filter(a => !a.is_archived)
  if (!isEdit && activeAccounts.length === 0) {
    return (
      <Sheet
        title="New bill"
        onClose={onCancel}
        saving={saving}
      >
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-surface-2 border border-line rounded-2xl flex items-center justify-center mx-auto mb-4 text-fg-subtle">
            <Wallet className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-fg">No accounts yet</p>
          <p className="text-xs text-fg-subtle mt-1 max-w-[280px] mx-auto leading-relaxed">
            Bills are paid from an account. Add one in{' '}
            <strong className="text-fg-muted">Profile → Bank Accounts</strong>{' '}
            first, then come back here.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="mt-5 w-full py-3 rounded-xl text-sm font-semibold bg-surface-2 text-fg-muted hover:bg-surface-3 transition-colors"
            style={{ minHeight: 44 }}
          >
            Close
          </button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet
      title={isEdit ? 'Edit bill' : 'New bill'}
      onClose={onCancel}
      saving={saving}
      hasUnsavedChanges={hasChanges}
    >
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="bill-name"
            className="block text-[11px] font-bold text-fg-subtle uppercase tracking-wider"
          >
            Name
          </label>
          <span
            className={`text-[10px] font-medium ${
              draft.name.length > NAME_MAX ? 'text-danger' : 'text-fg-subtle'
            }`}
          >
            {draft.name.length}/{NAME_MAX}
          </span>
        </div>
        <input
          id="bill-name"
          ref={nameRef}
          type="text"
          value={draft.name}
          onChange={setField('name')}
          maxLength={NAME_MAX + 5}
          placeholder={isBnpl ? 'e.g. iPhone 15' : 'e.g. Netflix, Rent'}
          disabled={saving}
          className={`w-full bg-surface border rounded-xl py-3 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors disabled:bg-surface-2 disabled:opacity-70 ${
            errors.name
              ? 'border-danger-border focus:border-danger'
              : 'border-line focus:border-brand'
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-[11px] text-danger font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.name}
          </p>
        )}
      </div>

      {/* Type — Recurring vs BNPL */}
      <div>
        <label className="block text-[11px] font-bold text-fg-subtle uppercase tracking-wider mb-2">
          Type
        </label>
        <SlidingSegmentedControl
          items={TYPE_ITEMS}
          value={draft.kind}
          onChange={setKind}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="bill-amount"
            className="block text-[11px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5"
          >
            {isBnpl ? 'Instalment (RM)' : 'Amount (RM)'}
          </label>
          <input
            id="bill-amount"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            value={draft.amount}
            onChange={setField('amount')}
            disabled={saving}
            className={`w-full bg-surface border rounded-xl py-3 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors disabled:bg-surface-2 disabled:opacity-70 ${
              errors.amount
                ? 'border-danger-border focus:border-danger'
                : 'border-line focus:border-brand'
            }`}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="mt-1 text-[11px] text-danger font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.amount}
            </p>
          )}
        </div>

        {/* Right column: due day for recurring, term for BNPL */}
        {isBnpl ? (
          <div>
            <label
              htmlFor="bill-term"
              className="block text-[11px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5"
            >
              Instalments left
            </label>
            <input
              id="bill-term"
              type="number"
              min="1"
              max={TERM_MAX}
              inputMode="numeric"
              value={draft.termMonths}
              onChange={setField('termMonths')}
              disabled={saving}
              className={`w-full bg-surface border rounded-xl py-3 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors disabled:bg-surface-2 disabled:opacity-70 ${
                errors.termMonths
                  ? 'border-danger-border focus:border-danger'
                  : 'border-line focus:border-brand'
              }`}
              placeholder="e.g. 12"
            />
            {errors.termMonths && (
              <p className="mt-1 text-[11px] text-danger font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.termMonths}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label
              htmlFor="bill-due-day"
              className="block text-[11px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5"
            >
              Due day
            </label>
            <input
              id="bill-due-day"
              type="number"
              min="1"
              max="31"
              inputMode="numeric"
              value={draft.dueDay}
              onChange={setField('dueDay')}
              disabled={saving}
              className={`w-full bg-surface border rounded-xl py-3 px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors disabled:bg-surface-2 disabled:opacity-70 ${
                errors.dueDay
                  ? 'border-danger-border focus:border-danger'
                  : 'border-line focus:border-brand'
              }`}
              placeholder="1–31"
            />
            {errors.dueDay && (
              <p className="mt-1 text-[11px] text-danger font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.dueDay}
              </p>
            )}
          </div>
        )}
      </div>

      {/* BNPL: first payment date */}
      {isBnpl && (
        <div className="animate-fadeIn">
          <label
            htmlFor="bill-first-payment"
            className="block text-[11px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5"
          >
            First payment date
          </label>
          <input
            id="bill-first-payment"
            type="date"
            value={draft.firstPaymentDate}
            onChange={setField('firstPaymentDate')}
            disabled={saving}
            className={`w-full bg-surface border rounded-xl py-3 px-3 text-sm text-fg outline-none transition-colors disabled:bg-surface-2 disabled:opacity-70 ${
              errors.firstPaymentDate
                ? 'border-danger-border focus:border-danger'
                : 'border-line focus:border-brand'
            }`}
          />
          <p className="mt-1.5 text-[11px] text-fg-muted leading-relaxed">
            When the first instalment was (or will be) paid. Set a past date
            to track an ongoing plan; a future date for one starting later.
          </p>
          {errors.firstPaymentDate && (
            <p className="mt-1 text-[11px] text-danger font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.firstPaymentDate}
            </p>
          )}
        </div>
      )}

      {!isBnpl && (
        <p className="text-[11px] text-fg-muted leading-relaxed">
          Bills due on 29–31 fall on the last day in shorter months.
        </p>
      )}

      <div>
        <label
          htmlFor="bill-account"
          className="block text-[11px] font-bold text-fg-subtle uppercase tracking-wider mb-1.5"
        >
          Deduct from
        </label>
        <select
          id="bill-account"
          value={draft.accountId}
          onChange={setField('accountId')}
          disabled={saving}
          className={`w-full bg-surface border rounded-xl py-3 px-3 text-sm text-fg outline-none transition-colors disabled:bg-surface-2 disabled:opacity-70 ${
            errors.accountId
              ? 'border-danger-border focus:border-danger'
              : 'border-line focus:border-brand'
          }`}
        >
          <option value="">Select account…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.account_name}
              {a.is_archived ? ' (archived)' : ''}
            </option>
          ))}
        </select>
        {account && !accountIsArchived && (
          <p className="mt-1.5 text-[11px] text-fg-muted">
            Balance:{' '}
            <strong className="text-fg">{formatMYR(account.balance || 0)}</strong>
          </p>
        )}
        {accountIsArchived && (
          <p className="mt-1.5 text-[11px] text-warning-text font-medium">
            This account is archived. Choose a different one.
          </p>
        )}
        {errors.accountId && (
          <p className="mt-1 text-[11px] text-danger font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.accountId}
          </p>
        )}
      </div>

      {serverError && (
        <div className="bg-danger-soft border border-danger-border rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-xs text-danger-text font-medium leading-relaxed">{serverError}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-fg-muted hover:bg-surface-2 transition-colors disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-bold bg-brand-solid hover:bg-brand-solid-hover text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ minHeight: 44 }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : isEdit ? 'Save changes' : isBnpl ? 'Add BNPL plan' : 'Add bill'}
        </button>
      </div>
    </Sheet>
  )
}