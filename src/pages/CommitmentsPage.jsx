// src/pages/CommitmentsPage.jsx
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
  onUnmarkAsPaid
}) => (
  <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 space-y-4">

    {/* Desktop page header — matches LogItemPage / TransactionsPage */}
    <div className="hidden md:block mb-5 px-1">
      <h1 className="text-xl font-bold text-fg tracking-tight">Bills</h1>
      <p className="text-xs text-fg-subtle mt-1">Track subscriptions & recurring payments</p>
    </div>

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