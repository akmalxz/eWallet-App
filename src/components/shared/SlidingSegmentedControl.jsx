// src/components/shared/SlidingSegmentedControl.jsx
/**
 * Sliding segmented control with a glass container and a
 * spring-eased active pill. Matches the app's liquid-glass nav.
 *
 * items: [{ id: string|number, label: string }]
 * value: currently active id
 * onChange: (id) => void
 */
export const SlidingSegmentedControl = ({ items, value, onChange, className = '' }) => {
  const n = items.length
  const activeIndex = items.findIndex(item => item.id === value)

  return (
    <div
      className={`relative w-full h-11 rounded-2xl bg-glass-bg backdrop-blur-2xl border border-glass-border shadow-[0_4px_16px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)] overflow-hidden ${className}`}
    >
      {/* Sliding pill — absolutely positioned, translated by percent of its own width.
          Pill width = 100/n % of container → equals one button's width.
          translateX(activeIndex * 100%) uses percentage of the pill's own width,
          so it always lands exactly on the active button's left edge. */}
      {activeIndex >= 0 && (
        <div
          className="absolute inset-y-0 left-0 pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            width: `${100 / n}%`,
            transform: `translateX(${activeIndex * 100}%)`
          }}
        >
          <div className="absolute inset-1 rounded-xl bg-fg shadow-[0_4px_16px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(0,0,0,0.06)]" />
        </div>
      )}

      {/* Buttons in a flex row — flex-1 + min-w-0 force equal widths */}
      <div className="relative flex items-center h-full">
        {items.map(item => {
          const isActive = item.id === value
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`relative z-10 flex-1 min-w-0 h-full flex items-center justify-center px-2 transition-colors duration-300 text-xs font-bold ${
                isActive
                  ? 'text-fg-inverse'
                  : 'text-fg-subtle hover:text-fg-muted'
              }`}
            >
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}