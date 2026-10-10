// src/components/shared/ErrorBoundary.jsx
import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Log to your monitoring service when you add one (Sentry, etc.)
    console.error('ErrorBoundary caught:', error, info)
    this.setState({ info })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ error: null, info: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh bg-page flex items-center justify-center p-4 px-safe py-safe">
          <div className="bg-surface rounded-2xl shadow-sm border border-danger-border p-8 max-w-md w-full text-center">
            <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
            <h2 className="text-xl font-bold text-fg mb-2">Something went wrong</h2>
            <p className="text-sm text-fg-muted mb-4">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-surface-2 hover:bg-surface-3 text-fg px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ minHeight: 44 }}
              >
                Try again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 bg-brand-solid hover:bg-brand-solid-hover text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ minHeight: 44 }}
              >
                Reload app
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}