// src/components/dashboard/OnboardingChecklist.jsx
import { Sparkles, Check, ChevronRight, X } from 'lucide-react'

export const OnboardingChecklist = ({
  steps,
  completedCount,
  totalCount,
  onStepClick,
  onDismiss,
}) => {
  return (
    <section className="border-y border-line">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-fg">Get started</p>
            <p className="text-xs text-fg-muted tabular-figures">
              {completedCount} of {totalCount} complete
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="no-min-tap p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors shrink-0"
          aria-label="Dismiss checklist"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 pb-3">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < completedCount ? 'bg-brand-solid' : 'bg-surface-3'
            }`}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Steps */}
      <div className="border-t border-line divide-y divide-line/60">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepClick(step.id)}
            className="w-full flex items-center gap-3 py-3 text-left transition-colors hover:bg-surface-2/50 focus:outline-none focus-visible:bg-surface-2"
            style={{ minHeight: 56 }}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                step.done
                  ? 'bg-success-solid text-white'
                  : 'border-2 border-line-strong'
              }`}
              aria-hidden="true"
            >
              {step.done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold truncate ${
                  step.done ? 'text-fg-subtle line-through' : 'text-fg'
                }`}
              >
                {step.label}
              </p>
              {!step.done && step.hint && (
                <p className="text-xs text-fg-subtle truncate mt-0.5">
                  {step.hint}
                </p>
              )}
            </div>

            <ChevronRight className="w-4 h-4 text-fg-subtle shrink-0" aria-hidden="true" />
          </button>
        ))}
      </div>

    </section>
  )
}