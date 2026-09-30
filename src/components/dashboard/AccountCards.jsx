// src/components/dashboard/AccountCards.jsx
import { useState } from 'react'
import { Wallet, Plus, Eye, EyeOff } from 'lucide-react'
import { AccountCard } from '../shared/AccountCard'

export const AccountCards = ({
  accounts,
  classifications,
  onAddAccount,
  onLogTransaction,
  onManageAccount,
  onTogglePin,
  onMoveAccount
}) => {
  const [expandedId, setExpandedId] = useState(null)
  const [showBalances, setShowBalances] = useState(true)

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const toggleBalances = () => setShowBalances(!showBalances)

  if (!accounts || accounts.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-sm font-medium text-slate-700 mb-1">No Accounts Yet</h3>
        <p className="text-xs text-slate-400 mb-4">Add your first bank account to start tracking</p>
        <button
          onClick={onAddAccount}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>
    )
  }

  const expandedIndex = accounts.findIndex(acc => acc.id === expandedId)

  return (
    <div className="relative">
      {/* Header with balance toggle */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {accounts.length} Accounts
        </span>
        <button
          onClick={toggleBalances}
          className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
        >
          {showBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{showBalances ? 'Hide' : 'Show'} balances</span>
        </button>
      </div>

      <div className="relative md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
        {accounts.map((acc, index) => {
          const isExpanded = expandedId === acc.id
          const isPinned = !!acc.is_pinned
          const classLabel =
            classifications.find(c => c.key_name === acc.classification)?.label
            || 'Account'

          // Can only reorder within the same pin group
          const canMoveUp =
            index > 0 &&
            !!accounts[index - 1].is_pinned === isPinned
          const canMoveDown =
            index < accounts.length - 1 &&
            !!accounts[index + 1].is_pinned === isPinned

          // Mobile wallet stack positioning
          let mobileTranslateY = index * -110
          if (expandedIndex !== -1 && index > expandedIndex) {
            mobileTranslateY += 85
          }

          return (
            <div
              key={acc.id}
              className="transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] md:!transform-none md:!static"
              style={{
                transform: `translateY(${mobileTranslateY}px)`,
                zIndex: isExpanded ? 30 : index + 1,
                marginBottom: index === accounts.length - 1
                  ? `${(accounts.length - 1) * -110 + (isExpanded ? 85 : 0)}px`
                  : '0px'
              }}
            >
              <AccountCard
                account={acc}
                size="full"
                showBalance={showBalances}
                isExpanded={isExpanded}
                classificationLabel={classLabel}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                onToggleExpand={() => toggleExpand(acc.id)}
                onTogglePin={onTogglePin}
                onMoveAccount={onMoveAccount}
                onLogTransaction={onLogTransaction}
                onManageAccount={onManageAccount}
                onClick={() => {
                  if (window.innerWidth < 768 && !isExpanded) {
                    toggleExpand(acc.id)
                  }
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}