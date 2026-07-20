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
    label: 'Hub'
  },
  ewallet: {
    bg: 'from-purple-600 to-purple-800',
    border: 'border-purple-400',
    text: 'text-purple-100',
    label: 'eWallet'
  },
  digital_bank: {
    bg: 'from-emerald-600 to-emerald-800',
    border: 'border-emerald-400',
    text: 'text-emerald-100',
    label: 'Digital Bank'
  },
  savings: {
    bg: 'from-amber-600 to-amber-800',
    border: 'border-amber-400',
    text: 'text-amber-100',
    label: 'Savings'
  }
}

const DEFAULT_CARD = {
  bg: 'from-slate-600 to-slate-800',
  border: 'border-slate-400',
  text: 'text-slate-100',
  label: 'Account'
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

  // Find the array index of the currently active/expanded card
  const expandedIndex = accounts.findIndex(acc => acc.id === expandedId)

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

      {/* 
        Responsive Layout Engine:
        - Mobile: Relative base framework layout container container (No negative grid overlaps).
        - Desktop: Standard multi-column grid layouts.
      */}
      <div className="relative md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
        {accounts.map((acc, index) => {
          const { Icon } = getAccountIcon(acc.classification, classifications, ICON_MAP)
          const IconComponent = Icon || Wallet
          const cardStyle = getCardStyle(acc.classification)
          const isExpanded = expandedId === acc.id

          // Dynamic Mobile Apple-Wallet Stacking Calculations
          let mobileTranslateY = index * -110 // Base overlapping structure line value
          
          if (expandedIndex !== -1 && index > expandedIndex) {
            // Push all cards underneath the active one down by an extra 85px to avoid UI clipping
            mobileTranslateY += 85
          }

          return (
            <div
              key={acc.id}
              className="transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) md:!transform-none md:!static"
              style={{
                transform: `translateY(${mobileTranslateY}px)`,
                zIndex: isExpanded ? 30 : index + 1,
                // Reserve spacing at the bottom of the container only for the last card stack member
                marginBottom: index === accounts.length - 1 ? `${(accounts.length - 1) * -110 + (isExpanded ? 85 : 0)}px` : '0px'
              }}
            >
              {/* Card Container */}
              <div 
                onClick={() => {
                  if (window.innerWidth < 768 && !isExpanded) {
                    toggleExpand(acc.id)
                  }
                }}
                className={`
                  relative rounded-2xl overflow-hidden shadow-xl transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) h-full flex flex-col justify-between
                  bg-gradient-to-br ${cardStyle.bg}
                  border ${cardStyle.border}
                  ${isExpanded ? 'shadow-2xl md:scale-100' : 'hover:shadow-lg md:hover:scale-[1.02] cursor-pointer md:cursor-default'}
                `}
              >
                {/* Card Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                
                {/* Card Pattern Overlay */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>

                {/* Main Card Content */}
                <div className="relative p-4 md:p-5 flex-1 flex flex-col justify-between">
                  <div>
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
                          e.stopPropagation()
                          toggleExpand(acc.id)
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

                    {/* Balance */}
                    <div className="mb-2">
                      <p className={`text-xs ${cardStyle.text} opacity-60`}>Balance</p>
                      <p className={`text-2xl font-bold ${cardStyle.text} tracking-tight break-all`}>
                        {showBalances ? formatMYR(acc.balance) : '••••••'}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Content Grid Panel */}
                  <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                    <div className="overflow-hidden">
                      <div className="pt-4 border-t border-white/20">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button 
                            className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-medium py-2.5 rounded-xl transition-colors backdrop-blur-sm flex items-center justify-center gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation()
                              onLogTransaction?.(acc)
                            }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Transaction
                          </button>
                          <button 
                            className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium py-2.5 rounded-xl transition-colors backdrop-blur-sm flex items-center justify-center gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation()
                              onManageAccount?.(acc)
                            }}
                          >
                            <Settings className="w-3.5 h-3.5" />
                            Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="relative px-4 pb-3 flex items-center justify-between mt-auto">
                  <div className="flex gap-1.5">
                    <span className={`text-[10px] ${cardStyle.text} opacity-30 font-mono`}>••••</span>
                    <span className={`text-[10px] ${cardStyle.text} opacity-30 font-mono`}>••••</span>
                    <span className={`text-[10px] ${cardStyle.text} opacity-30 font-mono`}>••••</span>
                    <span className={`text-[10px] ${cardStyle.text} opacity-40 font-mono`}>••••</span>
                  </div>
                  <CreditCard className={`w-4 h-4 ${cardStyle.text} opacity-30`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}