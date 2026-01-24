import type { NextRequest } from 'next/server'
import { ValidatorProtocol } from 'next-cas-client'
import { handleAuth } from 'next-cas-client/app'

const casHandler = handleAuth({
  validator: ValidatorProtocol.CAS30,
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

  return (
    casHandler as unknown as (
      req: NextRequest,
      ctx: { params: { client: 'login' | 'logout' } },
    ) => Promise<Response>
  )(req, { params: { client: client } })
}
