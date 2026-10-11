// src/components/modals/ManualTransactionModal.jsx
import { X } from 'lucide-react'
import { TransactionForm } from '../transactions/TransactionForm'

export const ManualTransactionModal = ({
  setIsOpen,
  user,
  accounts,
  mainCategories,
  getSubCategories,
  fetchAllData,
  showToast,
  selectedAccount,
}) => {
  const handleClose = () => setIsOpen(false)

  // Escape key closes
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') handleClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-surface rounded-3xl max-w-md w-full overflow-hidden shadow-2xl max-h-[95vh] flex flex-col modal-enter border border-line">

        {/* Header — just the close button; the form provides its own
            dynamic icon + label internally. */}
        <div className="p-4 bg-surface border-b border-line flex justify-end items-center">
          <button
            onClick={handleClose}
            className="p-2 bg-surface-2 hover:bg-surface-3 flex items-center justify-center rounded-full transition-colors text-fg-subtle hover:text-fg"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 md:p-6 overflow-y-auto flex-1 bg-surface">
          <TransactionForm
            user={user}
            accounts={accounts}
            mainCategories={mainCategories}
            getSubCategories={getSubCategories}
            fetchAllData={fetchAllData}
            showToast={showToast}
            initialAccountId={selectedAccount?.id}
            onCancel={handleClose}
            onSuccess={handleClose}
            submitLabel="Log Transaction"
          />
        </div>
      </div>
    </div>
  )
}