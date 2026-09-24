import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/app/auth/requireSession'
import { AureHalAPIClient } from '@/lib/services/AureHalAPIClient'

/**
 * Backend proxy for the HAL issuing-body / institution facet search
 * (`authorityInstitution_s`). Backs the REPORT institution and THESE/HDR issuing-body
 * autocomplete. Returns `{ docs: string[] }` so it shares the debounced-search hook shape.
 */
export const GET = async (request: NextRequest) => {
  const { error: authError } = await requireSession()
  if (authError) return authError

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
