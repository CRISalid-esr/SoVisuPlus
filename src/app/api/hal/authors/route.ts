import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { AureHalAPIClient } from '@/lib/services/AureHalAPIClient'

/**
 * Backend proxy for the HAL author reference search (used by the "Search in HAL"
 * contributor autocomplete). Keeps the browser from calling api.archives-ouvertes.fr
 * directly (CORS) and keeps HAL access on the server side. Auth-only: HAL is public
 * reference data, but we require a logged-in user to avoid an open relay.
 */
export const GET = async (request: NextRequest) => {
  const session = (await getServerSession(authOptions)) as Session & {
    user: { username?: string }
  }
  if (!session?.user?.username) {
    return NextResponse.json(
      { error: 'User is not authenticated' },
      { status: 401 },
    )
  }

  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (query.length < 2) {
    return NextResponse.json({ docs: [] })
  }

  try {
    const docs = await new AureHalAPIClient().searchAuthors(query)
    return NextResponse.json({ docs })
  } catch (error) {
    console.error('❌ Error searching HAL authors:', error)
    return NextResponse.json(
      { error: 'Failed to query HAL author reference' },
      { status: 502 },
    )
  }
}
