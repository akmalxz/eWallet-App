// src/components/layouts/Header.jsx
import { useState } from 'react'
import { Activity, Plus, Settings, LogOut, Send, Menu, X } from 'lucide-react'

export const Header = ({ 
  omnibarText, 
  setOmnibarText, 
  handleOmnibarSubmit, 
  isLoading, 
  setIsTransactionModalOpen, 
  setIsSettingsModalOpen, 
  supabase 
}) => {
  const [isOmnibarExpanded, setIsOmnibarExpanded] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-3 py-2 md:py-3">
        {/* Top Row: Logo + Actions */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-1.5 md:p-2 rounded-lg">
              <Activity className="text-white w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h1 className="text-base md:text-xl font-bold tracking-tight">FlowState</h1>
          </div>

          {/* Mobile: Quick Actions + Menu Toggle */}
          <div className="flex items-center gap-1 md:hidden">
            <button 
              onClick={() => setIsOmnibarExpanded(!isOmnibarExpanded)}
              className="p-2 text-slate-500 hover:text-slate-700 rounded-lg transition-colors"
              aria-label="Search"
            >
              <Send className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsTransactionModalOpen(true)} 
              className="flex items-center justify-center p-2 bg-blue-500 text-white rounded-lg shadow-sm"
              aria-label="Add transaction"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-500 hover:text-slate-700 rounded-lg transition-colors"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <button 
              onClick={() => setIsTransactionModalOpen(true)} 
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" /> Log Data
            </button>
            <button 
              onClick={() => setIsSettingsModalOpen(true)} 
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={() => supabase.auth.signOut()} 
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile: Expanded Omnibar */}
        {isOmnibarExpanded && (
          <form 
            onSubmit={(e) => {
              handleOmnibarSubmit(e)
              setIsOmnibarExpanded(false)
            }} 
            className="mt-2 relative"
          >
            <input 
              type="text" 
              value={omnibarText} 
              onChange={(e) => setOmnibarText(e.target.value)} 
              placeholder='Type "spent 15 at GX Bank..."' 
              className="w-full bg-slate-100 border-2 border-blue-500 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none" 
              disabled={isLoading}
              autoFocus
            />
            <button 
              type="submit" 
              disabled={isLoading || !omnibarText.trim()} 
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Mobile: Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="mt-2 bg-white rounded-xl shadow-lg border border-slate-100 p-2 space-y-1 md:hidden">
            <button 
              onClick={() => {
                setIsSettingsModalOpen(true)
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