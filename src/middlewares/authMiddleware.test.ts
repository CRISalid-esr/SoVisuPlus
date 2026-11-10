/**
 * @jest-environment node
 */
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from './authMiddleware'

const withAuthHandler = jest.fn()
jest.mock('next-auth/middleware', () => ({
  withAuth: jest.fn(() => withAuthHandler),
}))

const event = {} as NextFetchEvent
const run = (path: string) => {
  const next = jest.fn((_req, _event, response: NextResponse) => response)
  return authMiddleware(next)(
    new NextRequest(`http://sovisuplus.local:3000${path}`),
    event,
  )
}

describe('authMiddleware', () => {
  const initialHint = process.env.KEYCLOAK_IDP_HINT

  beforeEach(() => {
    withAuthHandler.mockResolvedValue(
      NextResponse.redirect('http://sovisuplus.local:3000/fr'),
    )
  })
  afterEach(() => {
    if (initialHint === undefined) delete process.env.KEYCLOAK_IDP_HINT
    else process.env.KEYCLOAK_IDP_HINT = initialHint
  })

  it('lets the transient SSO route through without a session', async () => {
    process.env.KEYCLOAK_IDP_HINT = 'saml2-xyz'

    const response = (await run('/fr/transient-sso')) as NextResponse

    expect(withAuthHandler).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
  })

  it('answers 403 on the transient SSO route when no IdP is configured', async () => {
    delete process.env.KEYCLOAK_IDP_HINT

    const response = (await run('/fr/transient-sso')) as NextResponse

    expect(withAuthHandler).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it.each(['/fr/dashboard', '/fr/transient-sso/other', '/fr/x/transient-sso'])(
    'still protects %s',
    async (path) => {
      process.env.KEYCLOAK_IDP_HINT = 'saml2-xyz'

      const response = (await run(path)) as NextResponse

      expect(withAuthHandler).toHaveBeenCalledTimes(1)
      expect(response.status).toBe(307)
    },
  )
})
