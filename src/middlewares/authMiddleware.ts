import { CustomMiddleware } from '@/middlewares/chain'
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'
import { NextRequestWithAuth, withAuth } from 'next-auth/middleware'

// `/<lang>/transient-sso`: sign-in entry point that skips the splash screen.
const TRANSIENT_SSO_PATH = /^\/[^/]+\/transient-sso\/?$/

export const authMiddleware =
  (middleware: CustomMiddleware) =>
  async (request: NextRequest, event: NextFetchEvent) => {
    if (TRANSIENT_SSO_PATH.test(request.nextUrl.pathname)) {
      // Open to unauthenticated users, but only when an identity provider is configured.
      if (!process.env.KEYCLOAK_IDP_HINT) {
        return new NextResponse('Forbidden', { status: 403 })
      }
      return middleware(request, event, NextResponse.next())
    }

    const withAuthMiddleware = withAuth({
      pages: {
        signIn: '/fr',
        error: '/error',
      },
    })

    const customResponse = await withAuthMiddleware(
      request as NextRequestWithAuth,
      event,
    )
    return middleware(request, event, customResponse as NextResponse)
  }
