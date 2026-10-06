// src/components/layouts/Header.jsx
import { useState, useEffect } from 'react'
import {
  Settings, LogOut, Menu, X, SunMoon, Bell, HandCoins, Wallet
} from 'lucide-react'
import { ThemeToggle } from '../shared/ThemeToggle'
import { NotificationBell } from '../notifications/NotificationBell'
import { NotificationsSheet } from '../notifications/NotificationsSheet'
import { useFriendRequests } from '../../hooks/useFriendRequests'
import { formatMYR } from '../../utils/formatters'

export const Header = ({
  user,
  profile,
  currentView,
  setCurrentView,
  supabase,
  youOwe = [],
  awaitingConfirm = [],
  openDisputes = [],
  resolvedDisputes = [],
  youOweTotal = 0,
  owedToYouTotal = 0,
  actionableCount = 0,
  onNavigate
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  const { count: requestCount } = useFriendRequests(user)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e) => {
      if (e.matches) setIsMobileMenuOpen(false)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName =
    profile?.username?.trim() ||
    profile?.first_name?.trim() ||
    user?.email?.split('@')[0] ||
    'there'

  const greetingLine = `${getGreeting()}, ${firstName}`

  const viewTitles = {
    dashboard: greetingLine,
    log: 'Manual Entry',
    transactions: 'Ledger & Verification',
    commitments: 'Bills',
    network: 'My Network',
    split: 'Split Bill',
    analytics: 'Analytics',
    profile: 'Profile & Settings'
  }

  const mobileTitle = viewTitles[currentView] || 'FlowState'
  const desktopTitle = greetingLine

  const totalBadge = requestCount + actionableCount
  const hasAnyBadge = totalBadge > 0
  const badgeText = totalBadge > 9 ? '9+' : totalBadge

  const hasAnyDebt = youOweTotal > 0 || owedToYouTotal > 0

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err) {
      console.error('Sign out failed:', err?.message || err)
    }
  }

  const handleOpenNotifications = () => {
    setIsNotificationsOpen(true)
  }

  const handleSheetNavigate = (target) => {
    onNavigate?.(target)
    setIsNotificationsOpen(false)
    setIsMobileMenuOpen(false)
  }

  const handlePillNavigate = (target) => {
    onNavigate?.(target)
  }

  return (
    <>
      {/*
        Safe-area padding is applied here via `max()` so the base visual
        padding never stacks on top of the safe inset. In portrait the
        inset is 0, so the values below are just the base paddings. In
        landscape the left/right insets take over (notch), and content
        sits cleanly at the notch edge — never further.
      */}
      <header
        className="sticky top-0 z-20 bg-page"
        style={{
          paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
          paddingBottom: '0.5rem',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))'
        }}
      >
        <div className="relative">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
                aria-label="Go to dashboard"
              >
                <img
                  src="/favicon.svg"
                  alt=""
                  width="28"
                  height="28"
                  className="w-6 h-6 md:w-7 md:h-7 shrink-0"
                />
                <h1 className="text-base md:text-xl font-bold tracking-tight truncate text-fg">
                  <span className="md:hidden">{mobileTitle}</span>
                  <span className="hidden md:inline">{desktopTitle}</span>
                </h1>
              </button>

              {/* Mobile: menu button with dot */}
              <div className="flex items-center gap-1 md:hidden shrink-0">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="relative flex items-center justify-center w-11 h-11 p-0 text-fg-subtle hover:text-fg-muted rounded-lg transition-colors"
                  aria-label={
                    hasAnyBadge
                      ? `Toggle menu, ${totalBadge} notification${totalBadge === 1 ? '' : 's'}`
                      : 'Toggle menu'
                  }
                >
                  {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                  {hasAnyBadge && !isMobileMenuOpen && (
                    <span
                      className="absolute top-2 right-2 w-2 h-2 rounded-full bg-danger-solid pointer-events-none"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </div>

              {/* Desktop controls */}
              <div className="hidden md:flex items-center gap-1">
                <NotificationBell
                  count={totalBadge}
                  active={currentView === 'network' || currentView === 'split'}
                  onOpen={handleOpenNotifications}
                />
                <ThemeToggle className="ml-1" />
                <button
                  onClick={() => setCurrentView('profile')}
                  className={`p-2.5 rounded-full transition-colors ${
                    currentView === 'profile'
                      ? 'bg-brand-soft text-brand'
                      : 'text-fg-subtle hover:bg-surface-2'
                  }`}
                  title="Settings"
                  aria-label="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSignOut}
                  className="p-2.5 text-fg-subtle hover:bg-danger-soft hover:text-danger rounded-full transition-colors ml-1"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Header debt pill — hidden when both totals are zero */}
            {hasAnyDebt && (
              <div className="flex items-center gap-2 mt-2 md:mt-2.5">
                {youOweTotal > 0 && (
                  <button
                    onClick={() => handlePillNavigate('debts')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-warning-soft border border-warning-border hover:opacity-90 transition-opacity"
                    style={{ minHeight: 32 }}
                    aria-label={`You owe ${formatMYR(youOweTotal)}, tap to view`}
                  >
                    <HandCoins className="w-3.5 h-3.5 text-warning" />
                    <span className="text-[11px] font-bold text-warning-text">
                      You owe
                    </span>
                    <span className="text-[11px] font-black text-fg">
                      {formatMYR(youOweTotal)}
                    </span>
                  </button>
                )}
                {owedToYouTotal > 0 && (
                  <button
                    onClick={() => handlePillNavigate('debts')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-soft border border-brand hover:opacity-90 transition-opacity"
                    style={{ minHeight: 32 }}
                    aria-label={`Owed to you ${formatMYR(owedToYouTotal)}, tap to view`}
                  >
                    <Wallet className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[11px] font-bold text-brand">
                      Owed
                    </span>
                    <span className="text-[11px] font-black text-fg">
                      {formatMYR(owedToYouTotal)}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mobile dropdown menu */}
          {isMobileMenuOpen && (
            <div className="absolute left-0 right-0 top-full z-10 md:hidden pointer-events-none">
              <div className="mt-1 pointer-events-auto bg-surface/95 backdrop-blur-md rounded-xl shadow-lg border border-line p-2 space-y-1 animate-in slide-in-from-top-2 duration-200">

                <button
                  onClick={handleOpenNotifications}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-fg-muted hover:bg-surface-2 rounded-lg transition-colors"
                  style={{ minHeight: 44 }}
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-fg-subtle" />
                    Notifications
                  </div>
                  {hasAnyBadge && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-danger-solid text-white text-[10px] font-bold leading-none flex items-center justify-center">
                      {badgeText}
                    </span>
                  )}
                </button>

                <div className="w-full flex items-center justify-between gap-3 px-3 py-2">
                  <div className="flex items-center gap-3 text-sm text-fg-muted">
                    <SunMoon className="w-4 h-4 text-fg-subtle" />
                    Theme
                  </div>
                  <ThemeToggle />
                </div>

                <button
                  onClick={() => {
                    setCurrentView('profile')
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-fg-muted hover:bg-surface-2 rounded-lg transition-colors"
                  style={{ minHeight: 44 }}
                >
                  <Settings className="w-4 h-4 text-fg-subtle" />
                  Settings
                </button>

                <button
                  onClick={() => {
                    handleSignOut()
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-danger hover:bg-danger-soft rounded-lg transition-colors"
                  style={{ minHeight: 44 }}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>

              </div>
            </div>
          )}
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-full h-4 bg-gradient-to-b from-page via-page/50 to-transparent backdrop-blur-md"
        />
      </header>

      {/* Notifications sheet — rendered outside the sticky header to escape its stacking context */}
      {isNotificationsOpen && (
        <NotificationsSheet
          friendRequestCount={requestCount}
          youOwe={youOwe}
          awaitingConfirm={awaitingConfirm}
          openDisputes={openDisputes}
          resolvedDisputes={resolvedDisputes}
          onClose={() => setIsNotificationsOpen(false)}
          onNavigate={handleSheetNavigate}
        />
      )}
    </>
  )
}