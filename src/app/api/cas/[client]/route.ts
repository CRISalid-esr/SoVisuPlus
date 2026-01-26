import type { NextRequest } from 'next/server'
import { ValidatorProtocol } from 'next-cas-client'
import { handleAuth } from 'next-cas-client/app'

const casHandler = handleAuth({
  validator: ValidatorProtocol.CAS20,
  async loadUser(casUser) {
    console.log('[CAS] raw casUser:', JSON.stringify(casUser, null, 2))
    return casUser
  },
})

const isLoginOrLogout = (client: string): client is 'login' | 'logout' => {
  return client === 'login' || client === 'logout'
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ client: string }> },
) {
  const params = await context.params

  const client = params.client
  if (!isLoginOrLogout(client)) {
    return new Response('Not found', { status: 404 })
  }
  // Uncomment the following block to get CAS ticket validation logs
  // if (client === 'login') {
  //   const ticket = new URL(req.url).searchParams.get('ticket')
  //   if (ticket) {
  //     const host =
  //       req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  //     const service = `https://${host}/api/cas/login`
  //     console.log('[CAS] service URL:', service)
  //
  //     const validateUrl =
  //       `${process.env.NEXT_PUBLIC_CAS_URL}/serviceValidate` +
  //       `?service=${encodeURIComponent(service)}` +
  //       `&ticket=${encodeURIComponent(ticket)}`
  //     const r = await fetch(validateUrl, { headers: { accept: 'text/xml' } })
  //     console.log('[CAS] validateUrl', validateUrl)
  //     console.log('[CAS] validation XML:\n', await r.text())
  //   }
  // }

  return (
    casHandler as unknown as (
      req: NextRequest,
      ctx: { params: { client: 'login' | 'logout' } },
    ) => Promise<Response>
  )(req, { params: { client: client } })
}
