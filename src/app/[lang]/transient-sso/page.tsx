import { notFound } from 'next/navigation'
import TransientSso from './TransientSso'
import { resolveCallbackUrl } from './callbackUrl'

// KEYCLOAK_IDP_HINT is a runtime variable: never freeze it at build time.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ callbackUrl?: string | string[] }>
}

const TransientSsoPage = async ({ params, searchParams }: Props) => {
  const { lang } = await params
  const { callbackUrl } = await searchParams
  const idpHint = process.env.KEYCLOAK_IDP_HINT
  // Unreachable in practice: the middleware answers 403 when the variable is unset.
  if (!idpHint) notFound()

  return (
    <TransientSso
      idpHint={idpHint}
      callbackUrl={resolveCallbackUrl(callbackUrl, lang)}
    />
  )
}

export default TransientSsoPage
