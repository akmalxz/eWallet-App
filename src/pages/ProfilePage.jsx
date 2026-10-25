// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  LogOut, Layers, Building2, TrendingUp, TrendingDown,
  ChevronRight, Zap, Info
} from 'lucide-react'

import { BankAccountsModal } from '../components/modals/BankAccountsModal'
import { IncomeCategoriesModal } from '../components/modals/IncomeCategoriesModal'
import { ExpenseCategoriesModal } from '../components/modals/ExpenseCategoriesModal'
import { AutomationModal } from '../components/modals/AutomationModal'
import { PersonalDetailsModal } from '../components/modals/PersonalDetailsModal'
import { AvatarPickerModal } from '../components/modals/AvatarPickerModal'
import { AppFooter } from '../components/shared/AppFooter'
import { Avatar } from '../components/shared/Avatar'

const SetupButton = ({ id, title, icon: Icon, activeModal, openModal, onPress }) => {
  const isThisActive = activeModal === id
  const handleClick = () => {
    if (onPress) onPress()
    else openModal(id)
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors outline-none group ${
        isThisActive ? 'bg-surface-2' : 'hover:bg-surface-2'
      }`}
      style={{ minHeight: 56 }}
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-2.5 rounded-xl transition-colors duration-200 ${
            isThisActive
              ? 'bg-fg text-fg-inverse'
              : 'bg-surface-2 text-fg-muted group-hover:bg-surface-3'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-bold text-sm text-fg text-left">
          {title}
        </span>
      </div>
      <ChevronRight
        className={`w-4 h-4 transition-transform duration-200 ${
          isThisActive
            ? 'text-fg rotate-90'
            : 'text-fg-subtle group-hover:translate-x-0.5'
        }`}
      />
    </button>
  )
}

export function ProfilePage({
  user,
  profile,
  refreshProfile,
  accounts,
  activeAccounts,
  categories,
  getSubCategories,
  classifications,
  commitments = [],
  showToast,
  initialModal = null,
  onNavigate,
  fetchAccounts,
  fetchCategories,
  fetchRecentTransactions, // <-- Added
  fetchMonthlyData,
}) {
  const [activeModal, setActiveModal] = useState(initialModal)

  useEffect(() => {
    if (initialModal) setActiveModal(initialModal)
  }, [initialModal])

  const openModal = (section) => setActiveModal(section)
  const closeModal = () => setActiveModal(null)
  const handleOpenApiModal = () => openModal('api')

  const displayName =
    profile?.username?.trim() ||
    user?.email?.split('@')[0] ||
    'Your Vault'

  return (
    <div className="max-w-xl mx-auto animate-enter pb-12">

      <div className="flex items-center gap-4 pb-6 mb-6 border-b border-line">
        <Avatar
          profile={profile}
          size="lg"
          onClick={() => openModal('avatar')}
          showEditBadge
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-fg truncate">
            {displayName}
          </h2>
          <p className="text-xs text-fg-muted truncate">
            {user?.email}
          </p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-danger-soft text-danger transition-colors hover:bg-danger/20 shrink-0"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      <div className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
        <SetupButton id="personal_details" title="Personal Information" icon={Info} activeModal={activeModal} openModal={openModal} />
        <SetupButton id="banks" title="Bank Accounts" icon={Building2} activeModal={activeModal} openModal={openModal} />
        <SetupButton id="income" title="Income Categories" icon={TrendingUp} activeModal={activeModal} openModal={openModal} />
        <SetupButton id="expense" title="Expense Categories" icon={TrendingDown} activeModal={activeModal} openModal={openModal} />
        <SetupButton id="commitments" title="Bills" icon={Layers} activeModal={activeModal} openModal={openModal} onPress={() => onNavigate?.('commitments')} />
        <SetupButton id="api" title="Automation & Shortcuts" icon={Zap} activeModal={activeModal} openModal={handleOpenApiModal} />
      </div>

      {activeModal === 'avatar' && (
        <AvatarPickerModal user={user} profile={profile} closeModal={closeModal} showToast={showToast} refreshProfile={refreshProfile} />
      )}

      {activeModal === 'personal_details' && (
        <PersonalDetailsModal user={user} profile={profile} closeModal={closeModal} showToast={showToast} refreshProfile={refreshProfile} />
      )}

      {activeModal === 'banks' && (
        <BankAccountsModal
          user={user}
          accounts={accounts}
          classifications={classifications}
          closeModal={closeModal}
          fetchAccounts={fetchAccounts}
          fetchMonthlyData={fetchMonthlyData}
          showToast={showToast}
        />
      )}

      {activeModal === 'income' && (
        <IncomeCategoriesModal
          user={user}
          categories={categories}
          closeModal={closeModal}
          fetchCategories={fetchCategories}
          fetchRecentTransactions={fetchRecentTransactions} // <-- Passed down
          fetchMonthlyData={fetchMonthlyData}               // <-- Passed down
          showToast={showToast}
        />
      )}

      {activeModal === 'expense' && (
        <ExpenseCategoriesModal
          user={user}
          categories={categories}
          closeModal={closeModal}
          fetchCategories={fetchCategories}
          fetchRecentTransactions={fetchRecentTransactions} // <-- Passed down
          fetchMonthlyData={fetchMonthlyData}               // <-- Passed down
          showToast={showToast}
        />
      )}

      {activeModal === 'api' && (
        <AutomationModal user={user} closeModal={closeModal} showToast={showToast} />
      )}

      <AppFooter user={user} showToast={showToast} />
    </div>
  )
}