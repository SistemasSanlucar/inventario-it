import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
            Algo salió mal
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
            {this.state.error?.message || 'Error desconocido'}
          </p>
          <button
            className="button button-primary"
            onClick={() => { this.setState({ hasError: false, error: null }) }}
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
