// src/components/shared/ErrorBoundary.jsx
import { Component } from 'react'
import { AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react'
import { logError } from '../../lib/errorLogger'

/**
 * Top-level error boundary. Catches render-phase errors in the
 * entire app and shows a friendly recovery screen instead of a
 * blank white page.
 *
 * Every error is forwarded to logError() — the admin sees it in
 * the error_log table and via the realtime toast (see
 * useErrorMonitor).
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      info: null,
      showDetails: false,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })

    logError(error, {
      boundary: 'top-level',
      componentStack: info?.componentStack ?? null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleTryAgain = () => {
    this.setState({
      hasError: false,
      error: null,
      info: null,
      showDetails: false,
    })
  }

  toggleDetails = () => {
    this.setState((s) => ({ showDetails: !s.showDetails }))
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { error, showDetails } = this.state

    return (
      <div className="min-h-dvh bg-page flex items-center justify-center p-4 px-safe py-safe">
        <div className="bg-surface rounded-2xl shadow-sm border border-line p-8 max-w-lg w-full">

          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
            <h2 className="text-xl font-bold text-fg mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-fg-muted mb-6">
              The app hit an unexpected error. We've been notified.
              Try reloading — your data is safe.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={this.handleTryAgain}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-fg-muted bg-surface-2 hover:bg-surface-3 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={this.handleReload}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-brand-solid hover:bg-brand-solid-hover text-white transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Reload
            </button>
          </div>

          <button
            onClick={this.toggleDetails}
            className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-fg-subtle hover:text-fg-muted transition-colors"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showDetails ? 'rotate-180' : ''
              }`}
            />
            Technical details
          </button>

          {showDetails && (
            <pre className="mt-3 p-3 bg-surface-2 rounded-lg text-[10px] text-fg-muted overflow-x-auto max-h-48">
              {error?.message}
              {'\n\n'}
              {error?.stack}
            </pre>
          )}

        </div>
      </div>
    )
  }
}