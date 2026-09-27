// src/pages/SplitBillPage.jsx
import { Receipt, Sparkles, ChevronLeft, Bell, Zap, Users } from 'lucide-react'

export function SplitBillPage({ user, profile, showToast, onBack }) {
  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-4 px-1"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Hero — Coming Soon */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">

        {/* Soft background decoration */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

        {/* Icon */}
        <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20">
          <Receipt className="w-8 h-8" />
        </div>

        {/* Badge */}
        <div className="relative z-10 inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full mb-4">
          <Sparkles className="w-3 h-3" />
          Coming Soon
        </div>

        {/* Title + Description */}
        <h2 className="relative z-10 text-xl font-bold text-slate-800 mb-2">
          Split Bills with Friends
        </h2>
        <p className="relative z-10 text-sm text-slate-500 mb-8 max-w-sm leading-relaxed">
          Snap a photo of any receipt. Our Vision AI will extract each item so you can assign them to your friends and settle up effortlessly.
        </p>

        {/* Feature Preview List */}
        <div className="relative z-10 w-full max-w-sm space-y-2 mb-8">
          <div className="flex items-center gap-3 p-3 bg-white/60 border border-white/60 rounded-xl text-left">
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">AI Receipt Scanning</p>
              <p className="text-xs text-slate-500">Auto-detect items and prices</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/60 border border-white/60 rounded-xl text-left">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Assign to Friends</p>
              <p className="text-xs text-slate-500">Split items with anyone in your network</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/60 border border-white/60 rounded-xl text-left">
            <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Smart Settlements</p>
              <p className="text-xs text-slate-500">Track who owes what, instantly</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}