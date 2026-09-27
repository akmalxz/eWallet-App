// src/pages/CommitmentsPage.jsx
import { CommitmentRadar } from '../components/dashboard/CommitmentRadar'

export function CommitmentsPage({
  radarStats,
  radarCommitments,
  accounts,
  activeRadarId,
  setRadarAccountId,
  onAddCommitment,
  handleDeleteCommitment,
  handleToggleCommitment,
  handleMarkAsPaid
}) {
  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

        {/* Page Header */}
        <div className="hidden md:block mb-5">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Subscription & Bill Tracking</h1>
            <p className="text-xs text-slate-400 mt-1">Monitor your recurring commitments and liquidity safety</p>
        </div>

      {/* SECTION 3: COMMITMENT RADAR */}
      <CommitmentRadar
        radarStats={radarStats}
        commitments={radarCommitments}
        accounts={accounts}
        selectedAccountId={activeRadarId}
        onSelectAccount={setRadarAccountId}
        onAddCommitment={onAddCommitment}
        onDeleteCommitment={handleDeleteCommitment}
        onToggleCommitment={handleToggleCommitment}
        onMarkAsPaid={handleMarkAsPaid}
      />

    </div>
  )
}