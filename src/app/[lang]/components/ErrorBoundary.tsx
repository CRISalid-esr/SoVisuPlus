'use client'
import React, { Component, ErrorInfo } from 'react'

interface Props {
  children: React.ReactNode
  FallbackComponent: React.ComponentType<{ error: Error }>
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo)
  }

  render() {
    const { hasError, error } = this.state
    const { FallbackComponent, children } = this.props

    if (hasError) {
      return <FallbackComponent error={error!} />
    }

    return children
  }
}

export default ErrorBoundary
