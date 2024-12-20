'use client'
import React, { Component, ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

class ErrorBoundary extends Component<ErrorBoundaryProps> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error caught in Error Boundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please try again later.</div>
    }

    return this.props.children
  }
}

export default ErrorBoundary
