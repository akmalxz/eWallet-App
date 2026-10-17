// src/components/dashboard/AccountCards.jsx
import { useState } from 'react'
import { Wallet, Plus, Eye, EyeOff } from 'lucide-react'
import { AccountCard } from '../shared/AccountCard'
import { EmptyState } from '../analytics/AnalyticsShared'

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
      <div className="border border-dashed border-line-strong rounded-3xl p-2">
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          message="Add your first bank account to start tracking your money."
          hint="You can add more accounts anytime from Profile → Bank Accounts."
          action={{
            label: 'Add Account',
            icon: Plus,
            onClick: onAddAccount,
          }}
        />
      </div>
    )
  }

  const expandedIndex = accounts.findIndex((acc) => acc.id === expandedId)

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-fg-subtle uppercase tracking-wider">
          Accounts
        </span>
        <button
          onClick={toggleBalances}
          className="flex items-center justify-center gap-1.5 text-xs text-fg-subtle hover:text-fg-muted transition-colors px-3 py-2 rounded-lg hover:bg-surface-2"
          style={{ minHeight: 44 }}
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
            classifications.find((c) => c.key_name === acc.classification)?.label ||
            'Account'

          const canMoveUp =
            index > 0 && !!accounts[index - 1].is_pinned === isPinned
          const canMoveDown =
            index < accounts.length - 1 && !!accounts[index + 1].is_pinned === isPinned

          let mobileTranslateY = index * -110
          if (expandedIndex !== -1 && index > expandedIndex) {
            mobileTranslateY += 85
          }

          const anyExpanded = expandedIndex !== -1

          return (
            <div
              key={acc.id}
              className="account-card-cell transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                transform: `translateY(${mobileTranslateY}px)`,
                zIndex: isExpanded ? 30 : index + 1,
                marginBottom:
                  index === accounts.length - 1
                    ? `${(accounts.length - 1) * -110 + (anyExpanded ? 85 : 0)}px`
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