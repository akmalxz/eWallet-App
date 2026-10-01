// src/pages/CommitmentsPage.jsx
import { ArrowLeft } from 'lucide-react'
import { CommitmentRadar } from '../components/dashboard/CommitmentRadar'

export const CommitmentsPage = ({
  radarStats,
  radarSchedule,
  radarCommitments,
  payments,
  accounts,
  saving,
  isLoading,
  error,
  onAddCommitment,
  onUpdateCommitment,
  onDeleteCommitment,
  onPauseCommitment,
  onReactivateCommitment,
  onMarkAsPaid,
  onSkipCommitment,
  onUnmarkAsPaid,
  onBack
}) => (
  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

    <CommitmentRadar
      radarStats={radarStats}
      schedule={radarSchedule}
      commitments={radarCommitments}
      payments={payments}
      accounts={accounts}
      saving={saving}
      loading={isLoading}
      error={error}
      onAddCommitment={onAddCommitment}
      onUpdateCommitment={onUpdateCommitment}
      onDeleteCommitment={onDeleteCommitment}
      onPauseCommitment={onPauseCommitment}
      onReactivateCommitment={onReactivateCommitment}
      onMarkAsPaid={onMarkAsPaid}
      onSkipCommitment={onSkipCommitment}
      onUnmarkAsPaid={onUnmarkAsPaid}
    />
  </div>
)