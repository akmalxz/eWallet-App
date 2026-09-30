// src/components/layouts/Header.jsx
import { useState } from 'react'
import { Settings, LogOut, Menu, X } from 'lucide-react'

export const Header = ({ 
  user,
  profile,
  currentView,
  setCurrentView,
  supabase 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // ============================================
  // TIME-BASED GREETING
  // ============================================
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

  // ============================================
  // VIEW TITLE DICTIONARY
  // ============================================
  const viewTitles = {
    dashboard: `${getGreeting()}, ${firstName}`,
    log: 'Manual Entry',
    transactions: 'Ledger & Verification',
    commitments: 'Subscriptions',
    network: 'My Network',
    split: 'Split Bill',
    analytics: 'Analytics',
    profile: 'Profile & Settings'
  }

  const mobileTitle = viewTitles[currentView] || 'FlowState'

  return (
    <header
      className="bg-gradient-to-b from-slate-50 via-slate-50/80 to-transparent backdrop-blur-xl border-none sticky top-0 z-20"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="max-w-6xl mx-auto px-3 py-2 md:py-3">
        {/* Top Row: Logo + Actions */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo */}
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
            <h1 className="text-base md:text-xl font-bold tracking-tight truncate">
              <span className="md:hidden">{mobileTitle}</span>
              <span className="hidden md:inline">FlowState</span>
            </h1>
          </button>

          {/* Mobile: Menu Toggle */}
          <div className="flex items-center gap-1 md:hidden shrink-0">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-500 hover:text-slate-700 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <button 
              onClick={() => setCurrentView('profile')} 
              className={`p-2.5 rounded-full transition-colors ${
                currentView === 'profile'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-200/50'
              }`}
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={() => supabase.auth.signOut()} 
              className="p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors ml-1"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile: Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="mt-2 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-slate-100 p-2 space-y-1 md:hidden animate-in slide-in-from-top-2 duration-200">
            <button 
              onClick={() => {
                setCurrentView('profile')
                setIsMobileMenuOpen(false)
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Settings
            </button>
            <button 
              onClick={() => {
                supabase.auth.signOut()
                setIsMobileMenuOpen(false)
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}