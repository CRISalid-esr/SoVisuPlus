import { getServerSession, Session } from 'next-auth'
import { NextResponse } from 'next/server'
import authOptions from '@/app/auth/auth_options'

/**
 * API routes are excluded from the auth middleware (see `src/middleware.ts`),
 * so every route has to gate itself with one of the helpers below.
 */
export type AuthenticatedSession = Session & {
  user: Session['user'] & { username: string }
}

/**
 * Session of a logged-in user, or null. For routes that answer "not logged
 * in" in their own way (redirect, custom body).
 */
export const getAuthenticatedSession =
  async (): Promise<AuthenticatedSession | null> => {
    const session = await getServerSession(authOptions)
    if (!session?.user?.username) {
      return null
    }
    return session as AuthenticatedSession
  }

/** API-route gate: the session, or a ready-made 401 response. */
export const requireSession = async (): Promise<
  | { session: AuthenticatedSession; error?: never }
  | { session?: never; error: NextResponse }
> => {
  const session = await getAuthenticatedSession()
  if (!session) {
    return {
      error: NextResponse.json(
        { error: 'User is not authenticated' },
        { status: 401 },
      ),
    }
  }
  return { session }
}
