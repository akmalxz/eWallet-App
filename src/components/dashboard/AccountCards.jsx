// src/components/dashboard/AccountCards.jsx
import { useState } from 'react'
import { Wallet, Landmark, Activity, PiggyBank, Database, Plus, ChevronDown, ChevronUp, CreditCard, Eye, EyeOff, Settings } from 'lucide-react'
import { formatMYR, getAccountIcon } from '../../utils/formatters'

const ICON_MAP = { 
  Landmark, 
  Wallet, 
  Activity, 
  PiggyBank, 
  Database 
}

const CARD_COLORS = {
  hub: {
    bg: 'from-blue-600 to-blue-800',
    border: 'border-blue-400',
    text: 'text-blue-100',
    label: 'Hub',
    iconBg: 'bg-blue-500/30'
  },
  ewallet: {
    bg: 'from-purple-600 to-purple-800',
    border: 'border-purple-400',
    text: 'text-purple-100',
    label: 'eWallet',
    iconBg: 'bg-purple-500/30'
  },
  digital_bank: {
    bg: 'from-emerald-600 to-emerald-800',
    border: 'border-emerald-400',
    text: 'text-emerald-100',
    label: 'Digital Bank',
    iconBg: 'bg-emerald-500/30'
  },
  savings: {
    bg: 'from-amber-600 to-amber-800',
    border: 'border-amber-400',
    text: 'text-amber-100',
    label: 'Savings',
    iconBg: 'bg-amber-500/30'
  }
}

const DEFAULT_CARD = {
  bg: 'from-slate-600 to-slate-800',
  border: 'border-slate-400',
  text: 'text-slate-100',
  label: 'Account',
  iconBg: 'bg-slate-500/30'
}

export const AccountCards = ({ 
  accounts, 
  classifications, 
  onAddAccount,
  onLogTransaction,
  onManageAccount
}) => {
  const [expandedId, setExpandedId] = useState(null)
  const [showBalances, setShowBalances] = useState(true)

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const toggleBalances = () => {
    setShowBalances(!showBalances)
  }

  const getCardStyle = (classification) => {
    return CARD_COLORS[classification] || DEFAULT_CARD
  }

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

  return (
    <div className="relative">
      {/* Header with balance toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accounts</span>
          <span className="text-xs text-slate-300">•</span>
          <span className="text-xs text-slate-400">{accounts.length} nodes</span>
        </div>
        <button
          onClick={toggleBalances}
          className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
        >
          {showBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{showBalances ? 'Hide' : 'Show'} balances</span>
        </button>
      </div>

      {/* Card Stack */}
      <div className="relative space-y-[-20px] md:space-y-[-30px]">
        {accounts.map((acc, index) => {
          // Direct integration with the layout utility object
          const { Icon } = getAccountIcon(acc.classification, classifications, ICON_MAP)
          const IconComponent = Icon || Wallet
          const cardStyle = getCardStyle(acc.classification)
          const isExpanded = expandedId === acc.id
          const isFirst = index === 0

          return (
            <div
              key={acc.id}
              className={`
                relative transition-all duration-300 ease-in-out
                ${isExpanded ? 'z-10' : 'z-0'}
                ${!isExpanded && !isFirst ? 'cursor-pointer' : ''}
              `}
              style={{
                transform: !isExpanded && !isFirst ? `translateY(${(index) * 4}px)` : 'translateY(0)',
                marginBottom: isExpanded ? '12px' : '0px'
              }}
              onClick={() => !isExpanded && toggleExpand(acc.id)}
            >
              {/* Card */}
              <div className={`
                relative rounded-2xl overflow-hidden shadow-lg transition-all duration-300
                bg-gradient-to-br ${cardStyle.bg}
                border ${cardStyle.border}
                ${isExpanded ? 'shadow-xl scale-100' : 'shadow-md hover:shadow-lg'}
                ${!isExpanded && !isFirst ? 'scale-[0.98]' : ''}
              `}>
                {/* Card Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                
                {/* Card Pattern Overlay */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>

                {/* Main Card Content */}
                <div className="relative p-4 md:p-5">
                  {/* Top Row: Icon + Classification + Toggle Button */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center p-2 rounded-xl bg-white/15 backdrop-blur-sm">
                        <IconComponent className={`w-5 h-5 ${cardStyle.text}`} />
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${cardStyle.text} opacity-80`}>
                          {cardStyle.label}
                        </p>
                        <p className={`text-sm font-bold ${cardStyle.text}`}>
                          {acc.account_name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Fixed: Stops event bubbling up to parent div toggle logic
                        toggleExpand(acc.id);
                      }}
                      className="flex items-center justify-center p-1.5 rounded-full transition-all duration-300 bg-white/15 backdrop-blur-sm hover:bg-white/25"
                    >
                      {isExpanded ? (
                        <ChevronUp className={`w-4 h-4 ${cardStyle.text}`} />
                      ) : (
                        <ChevronDown className={`w-4 h-4 ${cardStyle.text}`} />
                      )}
                    </button>
                  </div>

                  {/* Balance - Always visible */}
                  <div className="mb-2">
                    <p className={`text-xs ${cardStyle.text} opacity-60`}>Balance</p>
                    <p className={`text-2xl md:text-3xl font-bold ${cardStyle.text} tracking-tight`}>
                      {showBalances ? formatMYR(acc.balance) : '••••••'}
                    </p>
                  </div>

                  {/* Expanded Content - Core Actions */}
                  {isExpanded && (
                    // Fixed: Replaced dynamic custom utility class with robust standard utilities
                    <div className="mt-4 pt-4 border-t border-white/20 transition-all opacity-100 duration-200">
                      <div className="flex gap-3">
                        <button 
                          className="flex-1 bg-white/20 hover:bg-white/30 text-white text-sm font-medium py-3 rounded-xl transition-colors backdrop-blur-sm flex items-center justify-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            onLogTransaction?.(acc)
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          Log Transaction
                        </button>
                        <button 
                          className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-3 rounded-xl transition-colors backdrop-blur-sm flex items-center justify-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            onManageAccount?.(acc)
                          }}
                        >
                          <Settings className="w-4 h-4" />
                          Manage
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer - Mini card number placeholder */}
                <div className="relative px-4 pb-3 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span className={`text-[10px] ${cardStyle.text} opacity-30 font-mono`}>••••</span>
                    <span className={`text-[10px] ${cardStyle.text} opacity-30 font-mono`}>••••</span>
                    <span className={`text-[10px] ${cardStyle.text} opacity-30 font-mono`}>••••</span>
                    <span className={`text-[10px] ${cardStyle.text} opacity-40 font-mono`}>••••</span>
                  </div>
                  <CreditCard className={`w-4 h-4 ${cardStyle.text} opacity-30`} />
                </div>
              </div>

              {/* Collapsed cards indicator - small chip showing balance */}
              {!isExpanded && !isFirst && (
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-20">
                  <div className="bg-slate-800/90 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-full shadow-lg border border-white/10">
                    {showBalances ? formatMYR(acc.balance) : '••••'}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}