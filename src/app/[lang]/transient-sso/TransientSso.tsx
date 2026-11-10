'use client'

import { useEffect, useRef } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Loading from '@/components/Loading'

type Props = {
  /** Alias of the Keycloak identity provider to go straight to. */
  idpHint: string
  /** Already sanitised by the server page. */
  callbackUrl: string
}

/**
 * Signs the user in without showing the splash screen: Keycloak receives
 * `kc_idp_hint` and forwards the user to that identity provider.
 */
const TransientSso = ({ idpHint, callbackUrl }: Props) => {
  const { status } = useSession()
  const router = useRouter()
  const started = useRef(false)

  useEffect(() => {
    if (status === 'loading' || started.current) return
    started.current = true
    if (status === 'authenticated') {
      router.replace(callbackUrl)
    } else {
      signIn('keycloak', { callbackUrl }, { kc_idp_hint: idpHint })
    }
  }, [status, router, callbackUrl, idpHint])

  return <Loading />
}

export default TransientSso
