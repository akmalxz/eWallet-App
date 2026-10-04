// src/components/shared/LoadingSpinner.jsx
export const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-dvh bg-page flex items-center justify-center px-safe py-safe">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        <p className="text-sm text-fg-subtle">{message}</p>
      </div>
    </div>
  )
}