'use client' // Ensure this is a Client Component

import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorFallback from '@/components/ErrorFallback'

const Forbidden = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div>
        <h1>403 - Forbidden</h1>
        <p>You don t have permission to access this page.</p>
      </div>
    </ErrorBoundary>
  )
}

export default Forbidden
