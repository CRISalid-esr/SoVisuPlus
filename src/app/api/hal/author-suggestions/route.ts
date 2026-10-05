import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/app/auth/requireSession'
import { AureHalAPIClient } from '@/lib/services/AureHalAPIClient'

/**
 * Backend proxy for the HAL author-suggestion search (used by the "Not identified"
 * contributor suggestion panel). Takes the contributor's display name as `q`; the
 * service normalizes it (accents / hyphens / special chars) before searching.
 * Same auth rationale as the other HAL proxies.
 */
export const GET = async (request: NextRequest) => {
  const { error: authError } = await requireSession()
  if (authError) return authError

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
