// src/components/layouts/Header.jsx
import { useState } from 'react'
import { Settings, LogOut, Menu, X, SunMoon } from 'lucide-react'
import { ThemeToggle } from '../shared/ThemeToggle'

export const Header = ({ user, profile, currentView, setCurrentView, supabase }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  // Computed once, reused in both titles
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

  // Mobile: page name (the only orientation cue, since pages hide their H1 on mobile)
  const mobileTitle = viewTitles[currentView] || 'FlowState'
  // Desktop: always the greeting
  const desktopTitle = greetingLine

  return (
    <header className="sticky top-0 z-20 pt-safe px-safe">
      {/* Solid content bar */}
      <div className="relative bg-page">
        <div className="max-w-6xl mx-auto px-3 py-2 md:py-3">
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

            {/* Mobile: menu button only */}
            <div className="flex items-center gap-1 md:hidden shrink-0">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center justify-center w-11 h-11 p-0 text-fg-subtle hover:text-fg-muted rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Desktop: theme toggle + settings + sign out */}
            <div className="hidden md:flex items-center gap-2">
              <ThemeToggle />
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
                onClick={() => supabase.auth.signOut()}
                className="p-2.5 text-fg-subtle hover:bg-danger-soft hover:text-danger rounded-full transition-colors ml-1"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="mt-2 bg-surface/95 backdrop-blur-md rounded-xl shadow-lg border border-line p-2 space-y-1 md:hidden animate-in slide-in-from-top-2 duration-200">

              {/* Theme row */}
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
                  supabase.auth.signOut()
                  setIsMobileMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-danger hover:bg-danger-soft rounded-lg transition-colors"
                style={{ minHeight: 44 }}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>

            </div>
          )}
        </div>
      </div>

      {/* Scrim strip below the content bar */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-full h-4 bg-gradient-to-b from-page via-page/50 to-transparent backdrop-blur-md"
      />
    </header>
  )
}