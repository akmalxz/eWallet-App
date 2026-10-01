// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  User, LogOut, Layers, Building2, TrendingUp, TrendingDown,
  ChevronRight, Zap, Info
} from 'lucide-react'

// Modals
import { BankAccountsModal } from '../components/modals/BankAccountsModal'
import { IncomeCategoriesModal } from '../components/modals/IncomeCategoriesModal'
import { ExpenseCategoriesModal } from '../components/modals/ExpenseCategoriesModal'
import { AutomationModal } from '../components/modals/AutomationModal'
import { PersonalDetailsModal } from '../components/modals/PersonalDetailsModal'


// ============================================================
// SETUP BUTTON
// ============================================================

const SetupButton = ({
  id,
  title,
  icon: Icon,
  activeModal,
  openModal,
  onPress
}) => {
  const isThisActive = activeModal === id
  const handleClick = () => {
    if (onPress) onPress()
    else openModal(id)
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl p-5 mb-4 flex items-center justify-between transition-all duration-300 shadow-sm outline-none group ${
        isThisActive
          ? 'ring-2 ring-slate-900 shadow-md scale-[1.01]'
          : 'hover:bg-white hover:shadow-md hover:-translate-y-0.5'
      }`}
      style={{ minHeight: 44 }}
    >
      <div className="flex items-center gap-4">

        <div
          className={`p-2.5 rounded-xl transition-colors duration-300 ${
            isThisActive
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <span
          className={`font-bold text-base transition-colors ${
            isThisActive ? 'text-slate-900' : 'text-slate-800'
          }`}
        >
          {title}
        </span>
      </div>

      <ChevronRight
        className={`w-5 h-5 transition-transform duration-300 ${
          isThisActive
            ? 'text-slate-900 rotate-90'
            : 'text-slate-400 group-hover:translate-x-1'
        }`}
      />
    </button>
  )
}


// ============================================================
// PROFILE PAGE
// ============================================================

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
  fetchAllData,
  showToast,
  initialModal = null,
  onNavigate
}) {

  const [activeModal, setActiveModal] = useState(initialModal)

  // ----------------------------------------------------------
  // Sync initial modal
  // ----------------------------------------------------------

  useEffect(() => {
    if (initialModal) {
      setActiveModal(initialModal)
    }
  }, [initialModal])


  // ----------------------------------------------------------
  // Modal Controls
  // ----------------------------------------------------------

  const openModal = (section) => {
    setActiveModal(section)
  }

  const closeModal = () => {
    setActiveModal(null)
  }

  const handleOpenApiModal = () => {
    openModal('api')
  }


  // ----------------------------------------------------------
  // Display name fallback
  // ----------------------------------------------------------

  const displayName =
    profile?.username?.trim() ||
    user?.email?.split('@')[0] ||
    'Your Vault'


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* ======================================================
          PROFILE HEADER
      ====================================================== */}

      <div className="bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-3xl shadow-sm flex items-center gap-4 mb-8">

        <div className="bg-slate-900 p-4 rounded-full text-white">
          <User className="w-8 h-8" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900 truncate">
            {displayName}
          </h2>

          <p className="text-xs text-slate-500 truncate">
            {user?.email}
          </p>
        </div>

        <button
          onClick={() => supabase.auth.signOut()}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-50/80 text-red-500 transition-colors hover:bg-red-100 hover:text-red-600 shrink-0"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>

      </div>


      {/* ======================================================
          SETUP BUTTONS
      ====================================================== */}

      <div className="space-y-4">

        <SetupButton
          id="personal_details"
          title="Personal Information"
          icon={Info}
          activeModal={activeModal}
          openModal={openModal}
        />

        <SetupButton
          id="banks"
          title="Bank Accounts"
          icon={Building2}
          activeModal={activeModal}
          openModal={openModal}
        />

        <SetupButton
          id="income"
          title="Income Categories"
          icon={TrendingUp}
          activeModal={activeModal}
          openModal={openModal}
        />

        <SetupButton
          id="expense"
          title="Expense Categories"
          icon={TrendingDown}
          activeModal={activeModal}
          openModal={openModal}
        />

        {/* P4.3 — Bills row navigates to the Commitments page */}
        <SetupButton
          id="commitments"
          title="Bills"
          icon={Layers}
          activeModal={activeModal}
          openModal={openModal}
          onPress={() => onNavigate?.('commitments')}
        />

        <SetupButton
          id="api"
          title="Automation & Shortcuts"
          icon={Zap}
          activeModal={activeModal}
          openModal={handleOpenApiModal}
        />

      </div>


      {/* ======================================================
          MODALS
      ====================================================== */}

      {activeModal === 'personal_details' && (
        <PersonalDetailsModal
          user={user}
          profile={profile}
          closeModal={closeModal}
          showToast={showToast}
          refreshProfile={refreshProfile}
        />
      )}

      {activeModal === 'banks' && (
        <BankAccountsModal
          user={user}
          accounts={accounts}
          classifications={classifications}
          closeModal={closeModal}
          fetchAllData={fetchAllData}
          showToast={showToast}
        />
      )}

      {activeModal === 'income' && (
        <IncomeCategoriesModal
          user={user}
          categories={categories}
          closeModal={closeModal}
          fetchAllData={fetchAllData}
          showToast={showToast}
        />
      )}

      {activeModal === 'expense' && (
        <ExpenseCategoriesModal
          user={user}
          categories={categories}
          closeModal={closeModal}
          fetchAllData={fetchAllData}
          showToast={showToast}
        />
      )}

      {activeModal === 'api' && (
        <AutomationModal
          user={user}
          closeModal={closeModal}
          showToast={showToast}
        />
      )}

    </div>
  )
}