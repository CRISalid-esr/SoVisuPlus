import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { AureHalAPIClient } from '@/lib/services/AureHalAPIClient'

/**
 * Backend proxy for the HAL author-suggestion search (used by the "Not identified"
 * contributor suggestion panel). Takes the contributor's display name as `q`; the
 * service normalises it (accents / hyphens / special chars) before searching.
 * Same auth rationale as the other HAL proxies.
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
  if (!query) {
    return NextResponse.json({ docs: [] })
  }

  try {
    const docs = await new AureHalAPIClient().searchAuthorSuggestions(query)
    return NextResponse.json({ docs })
  } catch (error) {
    console.error('❌ Error searching HAL author suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to query HAL author reference' },
      { status: 502 },
    )
  }
}
