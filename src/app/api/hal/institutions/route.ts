import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { AureHalAPIClient } from '@/lib/services/AureHalAPIClient'

/**
 * Backend proxy for the HAL issuing-body / institution facet search
 * (`authorityInstitution_s`). Backs the REPORT institution and THESE/HDR issuing-body
 * autocomplete. Returns `{ docs: string[] }` so it shares the debounced-search hook shape.
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
    const values = await new AureHalAPIClient().searchInstitutions(query)
    // Wrap each string as a `{ value }` doc so the client autocomplete has a stable option shape.
    return NextResponse.json({ docs: values.map((value) => ({ value })) })
  } catch (error) {
    console.error('❌ Error searching HAL institutions:', error)
    return NextResponse.json(
      { error: 'Failed to query HAL institution facet' },
      { status: 502 },
    )
  }
}
