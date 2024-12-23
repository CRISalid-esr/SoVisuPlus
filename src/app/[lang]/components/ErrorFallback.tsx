// components/ErrorFallback.tsx
'use client' // Add this at the top to mark it as a Client Component

import React from 'react'

const ErrorFallback = ({ error }: { error: Error }) => {
  return (
    <div>
      <h1>Something went wrong!</h1>
      <p>{error.message}</p>
      <button onClick={() => window.location.reload()}>Try Again</button>
    </div>
  )
}

export default ErrorFallback
