// src/components/notifications/NotificationsSheet.jsx
import { useEffect } from 'react'
import {
  X, HandCoins, CheckCircle2, UserPlus, Bell, AlertTriangle, MessageSquare
} from 'lucide-react'
import { formatMYR } from '../../utils/formatters'

export function NotificationsSheet({
  friendRequestCount = 0,
  youOwe = [],
  awaitingConfirm = [],
  openDisputes = [],
  resolvedDisputes = [],
  onClose,
  onNavigate
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const hasAnything =
    friendRequestCount > 0 ||
    youOwe.length > 0 ||
    awaitingConfirm.length > 0 ||
    openDisputes.length > 0 ||
    resolvedDisputes.length > 0

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-title"
    >
      <div
        className="w-full md:max-w-md bg-surface rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-line-strong" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <h3 id="notif-title" className="text-base font-bold text-fg">Notifications</h3>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {!hasAnything && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center text-fg-subtle mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-fg">All caught up</p>
              <p className="text-xs text-fg-muted mt-1">No new notifications.</p>
            </div>
          )}

          {friendRequestCount > 0 && (
            <section>
              <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider px-5 pt-4 pb-2">
                Friend requests
              </p>
              <div className="px-3 pb-2">
                <button
                  onClick={() => onNavigate?.('network')}
                  className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-surface-2 transition-colors"
                  style={{ minHeight: 52 }}
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-fg">
                      {friendRequestCount} pending request{friendRequestCount === 1 ? '' : 's'}
                    </p>
                    <p className="text-[11px] text-fg-muted">Tap to review</p>
                  </div>
                </button>
              </div>
            </section>
          )}

          {youOwe.length > 0 && (
            <section>
              <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider px-5 pt-4 pb-2">
                You owe
              </p>
              <div className="px-3 pb-2 space-y-1">
                {youOwe.map(d => (
                  <button
                    key={d.id}
                    onClick={() => onNavigate?.('debts')}
                    className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-surface-2 transition-colors"
                    style={{ minHeight: 52 }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-warning-soft text-warning flex items-center justify-center shrink-0">
                      <HandCoins className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-fg truncate">{d.merchant}</p>
                      <p className="text-[11px] text-fg-muted truncate">to {d.counterpartyName}</p>
                    </div>
                    <span className="text-sm font-black text-fg shrink-0">
                      {formatMYR(d.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {awaitingConfirm.length > 0 && (
            <section>
              <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider px-5 pt-4 pb-2">
                Awaiting your confirmation
              </p>
              <div className="px-3 pb-2 space-y-1">
                {awaitingConfirm.map(d => (
                  <button
                    key={d.id}
                    onClick={() => onNavigate?.('debts')}
                    className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-surface-2 transition-colors"
                    style={{ minHeight: 52 }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-success-soft text-success flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-fg truncate">{d.merchant}</p>
                      <p className="text-[11px] text-fg-muted truncate">
                        {d.counterpartyName} marked paid
                      </p>
                    </div>
                    <span className="text-sm font-black text-fg shrink-0">
                      {formatMYR(d.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {openDisputes.length > 0 && (
            <section>
              <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider px-5 pt-4 pb-2">
                Disputes to review
              </p>
              <div className="px-3 pb-2 space-y-1">
                {openDisputes.map(d => (
                  <button
                    key={d.id}
                    onClick={() => onNavigate?.('debts')}
                    className="w-full flex items-start gap-3 p-3 text-left rounded-xl hover:bg-surface-2 transition-colors"
                    style={{ minHeight: 52 }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-warning-soft text-warning flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-fg truncate">{d.merchant}</p>
                      <p className="text-[11px] text-fg-muted truncate">
                        {d.counterpartyName} disputed
                      </p>
                      {d.disputeReason && (
                        <p className="text-[11px] text-fg-subtle truncate mt-0.5 italic">
                          "{d.disputeReason}"
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-black text-fg shrink-0">
                      {formatMYR(d.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {resolvedDisputes.length > 0 && (
            <section>
              <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider px-5 pt-4 pb-2">
                Dispute updates
              </p>
              <div className="px-3 pb-2 space-y-1">
                {resolvedDisputes.map(d => {
                  const accepted = d.disputeStatus === 'accepted'
                  return (
                    <button
                      key={d.id}
                      onClick={() => onNavigate?.('debts')}
                      className="w-full flex items-start gap-3 p-3 text-left rounded-xl hover:bg-surface-2 transition-colors"
                      style={{ minHeight: 52 }}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        accepted
                          ? 'bg-success-soft text-success'
                          : 'bg-surface-2 text-fg-subtle'
                      }`}>
                        {accepted
                          ? <CheckCircle2 className="w-4 h-4" />
                          : <MessageSquare className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-fg truncate">{d.merchant}</p>
                        <p className="text-[11px] text-fg-muted truncate">
                          {d.counterpartyName} {accepted ? 'adjusted your charge' : 'rejected your dispute'}
                        </p>
                        {d.disputeResolutionNote && (
                          <p className="text-[11px] text-fg-subtle truncate mt-0.5 italic">
                            "{d.disputeResolutionNote}"
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-black text-fg shrink-0">
                        {formatMYR(d.amount)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}