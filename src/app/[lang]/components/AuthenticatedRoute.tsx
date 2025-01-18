'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Loading from '@/components/Loading'

const AuthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!['authenticated', 'loading'].includes(status)) {
      router.push('/')
    }
  }, [status, router])

  if (status === 'loading') {
    return <Loading />
  }

  return <>{children}</>
}

export default AuthenticatedRoute
