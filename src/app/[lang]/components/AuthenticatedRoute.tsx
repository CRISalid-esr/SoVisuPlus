'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Loading from '@/components/Loading'
import useStore from '@/stores/global_store' // Import global store to access fetchConnectedUser

const AuthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const { status, data: session } = useSession()
  const router = useRouter()

  const {
    fetchConnectedUser,
    connectedUser,
    loading: userLoading,
  } = useStore((state) => ({
    fetchConnectedUser: state.fetchConnectedUser,
    connectedUser: state.connectedUser,
    loading: state.loading,
  }))

  console.log('session', session)
  useEffect(() => {
    // Only fetch connected user data if authenticated and not already fetched
    /* if (status === 'authenticated' && session?.accessToken && !connectedUser) {
      fetchConnectedUser() // Fetch user data only if not already fetched
    } else if (status === 'unauthenticated') {
      router.push('/') // Redirect to home page if unauthenticated
    }*/
  }, [status, session?.accessToken, connectedUser, fetchConnectedUser, router]) // Add dependencies to avoid unnecessary re-renders

  if (status === 'loading' || userLoading) {
    return <Loading /> // Show a loading state while verifying and fetching user data
  }

  if (!connectedUser) {
    return <div>No user data available</div> // Handle the case where no user data is available
  }

  return <>{children}</> // Render children if authenticated and data is available
}

export default AuthenticatedRoute
