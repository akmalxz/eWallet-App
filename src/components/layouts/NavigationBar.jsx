// src/components/layouts/NavigationBar.jsx
import {
  LayoutDashboard,
  List,
  Plus,
  Layers,
  User
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard',    icon: LayoutDashboard, label: 'Home' },
  { id: 'transactions', icon: List,            label: 'Ledger' },
  { id: 'log',          icon: Plus,            label: 'Log' },
  { id: 'commitments',  icon: Layers,          label: 'Bills' },
  { id: 'profile',      icon: User,            label: 'Profile' }
]

const DASHBOARD_SUBVIEWS = ['network', 'split', 'analytics']

export const NavigationBar = ({ currentView, setCurrentView }) => {
  const navKey = DASHBOARD_SUBVIEWS.includes(currentView)
    ? 'dashboard'
    : currentView

  const activeIndex = NAV_ITEMS.findIndex(item => item.id === navKey)

  const handleNavClick = (id) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setCurrentView(id)
  }

  return (
    <>
      {/* DESKTOP — Floating liquid glass pill */}
      <div className="hidden md:flex justify-center sticky top-[64px] z-10 pt-4 pb-3 px-4">
        <nav className="relative w-[560px] rounded-3xl bg-glass-bg backdrop-blur-2xl border border-glass-border shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <div className="relative flex items-center h-16">
            {activeIndex >= 0 && (
              <div
                className="absolute inset-y-0 left-0 pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{
                  width: `${100 / NAV_ITEMS.length}%`,
                  transform: `translateX(${activeIndex * 100}%)`
                }}
              >
                <div className="absolute inset-1.5 rounded-2xl bg-gradient-to-b from-glass-active via-glass-bg to-transparent backdrop-blur-xl border border-glass-border shadow-[0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]" />
              </div>
            )}
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = item.id === navKey
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  aria-label={item.label}
                  title={item.label}
                  className="relative z-10 flex-1 h-full min-w-0 p-0 m-0 flex items-center justify-center gap-2"
                >
                  <Icon className={`w-5 h-5 shrink-0 transition-colors duration-300 ${
                    isActive
                      ? 'text-brand'
                      : 'text-fg-subtle hover:text-fg-muted'
                  }`} />
                  <span className={`text-sm font-semibold transition-colors duration-300 ${
                    isActive
                      ? 'text-brand'
                      : 'text-fg-subtle hover:text-fg-muted'
                  }`}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {/*
        MOBILE — Fixed liquid glass pill.
        - `left` and `right` use max() so the nav clears the notch in
          landscape while keeping a 1rem minimum in portrait.
        - `bottom` is additive (1.5rem + safe inset) so the nav floats
          *above* the home indicator, not into it. Different intent
          from the sides — do not convert to max().
      */}
      <nav
        className="md:hidden fixed z-50 rounded-3xl bg-glass-bg backdrop-blur-2xl border border-glass-border shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
        style={{
          left: 'max(1rem, env(safe-area-inset-left, 0px))',
          right: 'max(1rem, env(safe-area-inset-right, 0px))',
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))'
        }}
      >
        <div className="relative flex items-center h-16">
          {activeIndex >= 0 && (
            <div
              className="absolute inset-y-0 left-0 pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                width: `${100 / NAV_ITEMS.length}%`,
                transform: `translateX(${activeIndex * 100}%)`
              }}
            >
              <div className="absolute inset-1.5 rounded-2xl bg-gradient-to-b from-glass-active via-glass-bg to-transparent backdrop-blur-xl border border-glass-border shadow-[0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]" />
            </div>
          )}
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = item.id === navKey
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                aria-label={item.label}
                className="relative z-10 flex-1 h-full min-w-0 p-0 m-0 flex items-center justify-center"
              >
                <span className="flex items-center justify-center w-10 h-10 leading-none">
                  <Icon className={`block w-5 h-5 shrink-0 transition-colors duration-300 ${
                    isActive
                      ? 'text-brand'
                      : 'text-fg-subtle'
                  }`} />
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}