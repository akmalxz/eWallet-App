// src/components/split/ItemReviewStep.jsx
import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Check, Plus, Trash2, AlertTriangle, Receipt,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

// Below this, we treat the difference as float noise and move on.
const MISMATCH_THRESHOLD = 0.05

// ============================================================================
// Item row — collapsed shows text, expanded shows inputs
// ============================================================================
function ItemRow({ item, isEditing, onOpen, onClose, onChange, onDelete }) {
  const nameRef = useRef(null)

  useEffect(() => {
    if (isEditing && nameRef.current) {
      nameRef.current.focus()
      nameRef.current.select()
    }
  }, [isEditing])

  const displayPrice = Number(item.price) || 0

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="w-full flex items-center justify-between p-3.5 text-left hover:bg-surface-2/50 transition-colors"
        style={{ minHeight: 44 }}
      >
        <span
          className={`text-sm font-medium truncate pr-3 ${
            item.name ? 'text-fg' : 'text-fg-subtle italic'
          }`}
        >
          {item.name || 'Untitled item'}
        </span>
        <span className="text-sm font-bold text-fg shrink-0">
          {formatMYR(displayPrice)}
        </span>
      </button>
    )
  }

  return (
    <div className="p-3 space-y-2.5 bg-surface-2/40">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">
          Edit item
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors"
          aria-label="Done editing"
          style={{ minHeight: 36, minWidth: 36 }}
        >
          <Check className="w-4 h-4" />
        </button>
      </div>

      <input
        ref={nameRef}
        type="text"
        value={item.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Item name"
        className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-brand transition-colors"
      />

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-fg-subtle font-medium">
            RM
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={item.price}
            onChange={(e) => onChange({ price: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-brand transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="p-2.5 rounded-lg text-red-500 hover:bg-red-50 border border-red-200 transition-colors"
          aria-label="Delete item"
          style={{ minHeight: 44, minWidth: 44 }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Main review step
// ============================================================================
export function ItemReviewStep({ initialData, onContinue, onCancel }) {
  const [merchant, setMerchant] = useState(initialData?.merchant || '')
  const [items, setItems] = useState(() =>
    (initialData?.items || []).map((it, i) => ({
      id: `item-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: it.name || '',
      price: it.price != null ? it.price : '',
    }))
  )
  const [tax, setTax] = useState(() =>
    initialData?.tax != null ? initialData.tax : 0
  )
  const [serviceCharge, setServiceCharge] = useState(() =>
    initialData?.service_charge != null ? initialData.service_charge : 0
  )
  const [editingId, setEditingId] = useState(null)
  const [mismatchResolved, setMismatchResolved] = useState(false)
  const taxInputRef = useRef(null)

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + (Number(i.price) || 0), 0),
    [items]
  )
  const computedTotal =
    subtotal + (Number(tax) || 0) + (Number(serviceCharge) || 0)
  const ocrTotal = Number(initialData?.total) || 0
  const mismatchDelta = Math.abs(computedTotal - ocrTotal)
  const hasMismatch =
    !mismatchResolved && ocrTotal > 0 && mismatchDelta >= MISMATCH_THRESHOLD

  const updateItem = (id, patch) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    )
  }

  const deleteItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const addItem = () => {
    const newItem = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      price: '',
    }
    setItems((prev) => [...prev, newItem])
    setEditingId(newItem.id)
  }

  const handleContinue = () => {
    const cleanItems = items
      .map((it) => ({
        name: String(it.name || '').trim(),
        price: Number(it.price) || 0,
      }))
      .filter((it) => it.name.length > 0)

    if (cleanItems.length === 0) return
    if (hasMismatch) return

    const cleanSubtotal = cleanItems.reduce((s, i) => s + i.price, 0)
    const cleanTax = Number(tax) || 0
    const cleanService = Number(serviceCharge) || 0

    onContinue({
      merchant: merchant.trim() || 'Receipt',
      items: cleanItems,
      subtotal: Math.round(cleanSubtotal * 100) / 100,
      tax: cleanTax,
      service_charge: cleanService,
      total: Math.round((cleanSubtotal + cleanTax + cleanService) * 100) / 100,
    })
  }

  const canContinue =
    items.some((it) => String(it.name).trim().length > 0) && !hasMismatch

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm font-bold text-fg-muted hover:text-fg transition-colors px-1"
          style={{ minHeight: 44 }}
        >
          <ChevronLeft className="w-4 h-4" /> Cancel
        </button>
        <div className="text-right min-w-0">
          <h1 className="text-base font-bold text-fg leading-tight truncate">
            Review Receipt
          </h1>
          <p className="text-[11px] text-fg-subtle leading-tight">
            Fix anything OCR got wrong
          </p>
        </div>
      </div>

      {/* Merchant */}
      <section className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 shadow-sm">
        <label
          htmlFor="review-merchant"
          className="block text-[11px] font-bold text-fg-subtle uppercase tracking-wider mb-2"
        >
          Merchant
        </label>
        <input
          id="review-merchant"
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="e.g. Murni Discovery"
          className="w-full bg-surface-2 border border-line rounded-xl py-3 px-3 text-sm text-fg outline-none focus:border-brand transition-colors"
        />
      </section>

      {/* Items */}
      <section className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-line flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-fg-subtle uppercase tracking-wider">
            Items ({items.length})
          </span>
          <span className="text-[11px] text-fg-subtle">
            Tap any row to edit
          </span>
        </div>

        {items.length === 0 ? (
          <div className="p-6 text-center">
            <Receipt className="w-8 h-8 text-fg-subtle mx-auto mb-2" />
            <p className="text-sm text-fg-muted">No items yet</p>
            <p className="text-xs text-fg-subtle mt-1">
              Add an item to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                isEditing={editingId === item.id}
                onOpen={() => setEditingId(item.id)}
                onClose={() => setEditingId(null)}
                onChange={(patch) => updateItem(item.id, patch)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addItem}
          className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-brand hover:bg-brand-soft border-t border-line transition-colors"
          style={{ minHeight: 44 }}
        >
          <Plus className="w-4 h-4" /> Add item
        </button>
      </section>

      {/* Totals */}
      <section className="bg-surface/60 backdrop-blur-xl border border-line/50 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-fg-muted">Subtotal</span>
          <span className="font-bold text-fg">{formatMYR(subtotal)}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="review-tax" className="text-sm text-fg-muted shrink-0">
            Tax
          </label>
          <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-fg-subtle font-medium">
              RM
            </span>
            <input
              id="review-tax"
              ref={taxInputRef}
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              className="w-full bg-surface border border-line rounded-lg py-2 pl-9 pr-3 text-sm text-fg text-right outline-none focus:border-brand transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="review-service" className="text-sm text-fg-muted shrink-0">
            Service charge
          </label>
          <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-fg-subtle font-medium">
              RM
            </span>
            <input
              id="review-service"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={serviceCharge}
              onChange={(e) => setServiceCharge(e.target.value)}
              className="w-full bg-surface border border-line rounded-lg py-2 pl-9 pr-3 text-sm text-fg text-right outline-none focus:border-brand transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-line">
          <span className="text-sm font-bold text-fg">Total</span>
          <span className="text-base font-black text-fg">
            {formatMYR(computedTotal)}
          </span>
        </div>
      </section>

      {/* Mismatch warning */}
      {hasMismatch && (
        <section className="bg-warning-soft border border-warning-border rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-warning-text">
                Total doesn't match the receipt
              </p>
              <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                The receipt says{' '}
                <strong className="text-fg">{formatMYR(ocrTotal)}</strong> but the
                items add up to{' '}
                <strong className="text-fg">{formatMYR(computedTotal)}</strong> — a
                difference of {formatMYR(mismatchDelta)}.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMismatchResolved(true)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-surface border border-line-strong text-fg hover:bg-surface-2 transition-colors"
              style={{ minHeight: 44 }}
            >
              Use items total
            </button>
            <button
              type="button"
              onClick={() => taxInputRef.current?.focus()}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-warning text-white hover:opacity-90 transition-opacity"
              style={{ minHeight: 44 }}
            >
              Adjust tax
            </button>
          </div>
        </section>
      )}

      {/* Continue */}
      <button
        type="button"
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full flex items-center justify-center gap-2 bg-brand-solid hover:bg-brand-solid-hover text-white py-4 rounded-2xl text-sm font-bold transition-colors disabled:opacity-50"
        style={{ minHeight: 56 }}
      >
        Continue to participants
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}