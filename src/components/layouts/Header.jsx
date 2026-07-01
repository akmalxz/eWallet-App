// src/components/layouts/Header.jsx
import { Activity, Plus, Settings, LogOut, Send } from 'lucide-react'

export const Header = ({ 
  omnibarText, 
  setOmnibarText, 
  handleOmnibarSubmit, 
  isLoading, 
  setIsTransactionModalOpen, 
  setIsSettingsModalOpen, 
  supabase 
}) => {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg">
              <Activity className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">FlowState</h1>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={() => setIsTransactionModalOpen(true)} className="p-2 bg-blue-500 text-white rounded-lg">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={() => supabase.auth.signOut()} className="p-2 text-red-400">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 max-w-2xl relative flex gap-3">
          <form onSubmit={handleOmnibarSubmit} className="relative flex-1">
            <input 
              type="text" 
              value={omnibarText} 
              onChange={(e) => setOmnibarText(e.target.value)} 
              placeholder='Type "spent 15 at GX Bank for lunch" or "moved 500 from Maybank to TNG"' 
              className="w-full bg-slate-100 border-2 border-transparent rounded-full py-2.5 pl-5 pr-12 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all" 
              disabled={isLoading} 
            />
            <button 
              type="submit" 
              disabled={isLoading || !omnibarText.trim()} 
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="hidden md:flex items-center gap-2 border-l border-slate-200 pl-4">
            <button 
              onClick={() => setIsTransactionModalOpen(true)} 
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" /> Log Data
            </button>
            <button 
              onClick={() => setIsSettingsModalOpen(true)} 
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={() => supabase.auth.signOut()} 
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}