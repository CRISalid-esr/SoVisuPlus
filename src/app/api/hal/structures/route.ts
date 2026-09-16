import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/app/auth/requireSession'
import { AureHalAPIClient } from '@/lib/services/AureHalAPIClient'

/**
 * Backend proxy for the HAL structure reference search (used by the "Add HAL
 * affiliation" autocomplete and the name-based affiliation suggestions). Same
 * rationale and auth rules as the author proxy.
 */
export const GET = async (request: NextRequest) => {
  const { error: authError } = await requireSession()
  if (authError) return authError

  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  // Structure search allows a 1-char minimum (affiliation suggestions); the
  // manual structure autocomplete still gates at 2 chars client-side.
  if (query.length < 1) {
    return NextResponse.json({ docs: [] })
  }

  try {
    const docs = await new AureHalAPIClient().searchStructures(query)
    return NextResponse.json({ docs })
  } catch (error) {
    console.error('❌ Error searching HAL structures:', error)
    return NextResponse.json(
      { error: 'Failed to query HAL structure reference' },
      { status: 502 },
    )
  }
}
