// src/components/modals/ModalWrapper.jsx
import { X } from 'lucide-react'

export const ModalWrapper = ({ title, closeModal, children }) => (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
    <div className="bg-white/90 backdrop-blur-xl border border-white/50 rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <button
          onClick={closeModal}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 pr-2 scrollbar-hide space-y-6">
        {children}
      </div>
    </div>
  </div>
)