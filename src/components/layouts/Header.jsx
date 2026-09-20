// src/components/layouts/Header.jsx
import { useState } from 'react'
import { Activity, Plus, Settings, LogOut, Send, Menu, X, LayoutDashboard } from 'lucide-react'

export const Header = ({ 
  omnibarText, 
  setOmnibarText, 
  handleOmnibarSubmit, 
  isLoading, 
  currentView,
  setCurrentView,
  supabase 
}) => {
  const [isOmnibarExpanded, setIsOmnibarExpanded] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white/60 backdrop-blur-xl border-b border-white/40 sticky top-0 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
      <div className="max-w-6xl mx-auto px-3 py-2 md:py-3">
        {/* Top Row: Logo + Actions */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo */}
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="bg-slate-900 p-1.5 md:p-2 rounded-lg shadow-sm">
              <Activity className="text-white w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h1 className="text-base md:text-xl font-bold tracking-tight">FlowState</h1>
          </button>

          {/* Mobile: Quick Actions + Menu Toggle */}
          <div className="flex items-center gap-1 md:hidden">
            <button 
              onClick={() => setIsOmnibarExpanded(!isOmnibarExpanded)}
              className="p-2 text-slate-500 hover:text-slate-700 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentView('log')} 
              className="flex items-center justify-center p-2 bg-blue-500 text-white rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-500 hover:text-slate-700 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <button 
              onClick={() => setCurrentView('dashboard')} 
              className={`p-2.5 rounded-full transition-colors ${currentView === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-200/50'}`}
              title="Dashboard"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentView('log')} 
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 shadow-sm text-white text-sm font-medium px-4 py-2 rounded-full transition-colors mx-1"
            >
              <Plus className="w-4 h-4" /> Log Data
            </button>
            <button 
              onClick={() => setCurrentView('profile')} 
              className={`p-2.5 rounded-full transition-colors ${currentView === 'profile' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-200/50'}`}
              title="Profile & Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={() => supabase.auth.signOut()} 
              className="p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors ml-1"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile: Expanded Omnibar */}
        {isOmnibarExpanded && (
          <form onSubmit={handleOmnibarSubmit} className="relative flex-1 max-w-2xl mx-auto">
          <label htmlFor="omnibar-input" className="sr-only">Quick log transaction</label>
          <input 
            id="omnibar-input"
            name="omnibar-input"
            type="text" 
            value={omnibarText}
            onChange={(e) => setOmnibarText(e.target.value)}
            placeholder="e.g. Spent RM 15 on lunch from TNG"
              className="w-full bg-white/80 border border-slate-200 shadow-inner rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-blue-500" 
              disabled={isLoading}
              autoFocus
            />
            <button 
              type="submit" 
              disabled={isLoading || !omnibarText.trim()} 
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

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