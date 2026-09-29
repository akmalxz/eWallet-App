// src/pages/CommitmentsPage.jsx
import { CommitmentRadar } from '../components/dashboard/CommitmentRadar'

export function CommitmentsPage({
  radarStats,
  radarCommitments,
  accounts,
  onAddCommitment,
  handleDeleteCommitment,
  handleToggleCommitment,
  handleMarkAsPaid,
  handleUnmarkAsPaid
}) {
  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* Page Header (desktop only — mobile title lives in the Header) */}
      <div className="hidden md:block mb-5">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          Subscription & Bill Tracking
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor your recurring commitments and liquidity safety
        </p>
      </div>

      <CommitmentRadar
        radarStats={radarStats}
        commitments={radarCommitments}
        accounts={accounts}
        onAddCommitment={onAddCommitment}
        onDeleteCommitment={handleDeleteCommitment}
        onToggleCommitment={handleToggleCommitment}
        onMarkAsPaid={handleMarkAsPaid}
        onUnmarkAsPaid={handleUnmarkAsPaid}
      />

    </div>
  )
}