'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import Loading from '@/components/Loading'

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
      router.push(callBackUrlAsString(searchParams.get('callbackUrl')))
    }
  }, [status, router, searchParams])

  if (status === 'loading') {
    return <Loading />
  }
  if (status === 'authenticated') {
    return <div>Redirecting...</div>
  }
  return <>{children}</>
}
UnauthenticatedRoute.displayName = 'UnauthenticatedRoute';

export default UnauthenticatedRoute
