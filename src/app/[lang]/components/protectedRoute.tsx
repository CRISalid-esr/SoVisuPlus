'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!['authenticated', 'loading'].includes(status)) {
      router.push('/')
    }
  }, [status, router])

  if (status === 'loading') {
    return <div>Loading...</div> // Show a loading state while verifying
  }

  return <>{children}</>
}

export default ProtectedRoute
