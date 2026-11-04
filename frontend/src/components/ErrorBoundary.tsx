import { Component, ErrorInfo, ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Application error', error, info) }
  render() {
    if (this.state.error) return <main className="not-found"><h1>Something went wrong</h1><p>Please refresh the page and try again.</p><button className="button button-primary" onClick={() => window.location.reload()}>Refresh</button></main>
    return this.props.children
  }
}
