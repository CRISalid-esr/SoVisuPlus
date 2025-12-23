import { CustomMiddleware } from '@/middlewares/chain'
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'
import { NextRequestWithAuth, withAuth } from 'next-auth/middleware'

export const authMiddleware =
  (middleware: CustomMiddleware) =>
  async (request: NextRequest, event: NextFetchEvent) => {
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
