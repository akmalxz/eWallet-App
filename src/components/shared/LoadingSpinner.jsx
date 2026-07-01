// src/components/shared/LoadingSpinner.jsx
export const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="text-sm text-slate-400">{message}</p>
      </div>
    </div>
  )
}