'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const DEFAULT_AUTHENTICATED_REDIRECT_URL = '/dashboard'
const callBackUrlAsString = (callbackUrl: string | null) => {
  if (callbackUrl) {
    return callbackUrl
  }
  return DEFAULT_AUTHENTICATED_REDIRECT_URL
}

const UnauthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      const callbackUrl = searchParams.get('callbackUrl')
      router.push(callBackUrlAsString(callbackUrl))
    }
  }, [status, router])

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  return <>{children}</>
}

export default UnauthenticatedRoute
