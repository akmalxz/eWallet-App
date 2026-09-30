// src/components/layouts/NavigationBar.jsx
import {
  LayoutDashboard,
  List,
  Plus,
  Layers,
  User
} from 'lucide-react'

// ============================================================
// NAV ITEMS — shared between desktop + mobile
// ============================================================
const NAV_ITEMS = [
  { id: 'dashboard',    icon: LayoutDashboard, label: 'Home' },
  { id: 'transactions', icon: List,            label: 'Ledger' },
  { id: 'log',          icon: Plus,            label: 'Log' },
  { id: 'commitments',  icon: Layers,          label: 'Bills' },
  { id: 'profile',      icon: User,            label: 'Profile' }
]

// Views that conceptually live inside the "Home" tab.
// When one is active, the Home tab stays highlighted.
const DASHBOARD_SUBVIEWS = ['network', 'split', 'analytics']

// ============================================================
// NAVIGATION BAR
// Renders both the desktop floating pill and the mobile bottom
// bar. Both use the same items and the same sliding indicator.
// Place this right after <Header /> so the desktop nav can
// stick to the top correctly.
// ============================================================
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
      {/* ============================================
          DESKTOP — Floating liquid glass pill
      ============================================ */}
      <div className="hidden md:flex justify-center sticky top-[64px] z-10 py-3 px-4">
        <nav className="relative w-[560px] rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          <div className="relative flex items-center h-16">
            {activeIndex >= 0 && (
              <div
                className="absolute inset-y-0 left-0 pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{
                  width: `${100 / NAV_ITEMS.length}%`,
                  transform: `translateX(${activeIndex * 100}%)`
                }}
              >
                <div className="absolute inset-1.5 rounded-2xl bg-gradient-to-b from-white/35 via-white/25 to-white/15 backdrop-blur-xl border border-white/40 shadow-[0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.5)]" />
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
                  <Icon className={`w-5 h-5 shrink-0 transition-colors duration-300 ${isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} />
                  <span className={`text-sm font-semibold transition-colors duration-300 ${isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {/* ============================================
          MOBILE — Fixed liquid glass pill
      ============================================ */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 z-50 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <div className="relative flex items-center h-16">
          {activeIndex >= 0 && (
            <div
              className="absolute inset-y-0 left-0 pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                width: `${100 / NAV_ITEMS.length}%`,
                transform: `translateX(${activeIndex * 100}%)`
              }}
            >
              <div className="absolute inset-1.5 rounded-2xl bg-gradient-to-b from-white/35 via-white/25 to-white/15 backdrop-blur-xl border border-white/40 shadow-[0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.5)]" />
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
                  <Icon className={`block w-5 h-5 shrink-0 transition-colors duration-300 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}