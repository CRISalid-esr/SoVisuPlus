import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/app/auth/requireSession'
import { AureHalAPIClient } from '@/lib/services/AureHalAPIClient'

/**
 * Backend proxy enriching a suggested HAL author profile with the data shown on
 * its suggestion card: the author's affiliations (/search/authorstructure) and
 * its number of HAL publications (/search). Fetched lazily, once a card is shown.
 *
 * `affiliations` is null unless firstName/lastName/email are all provided;
 * `publicationCount` is null unless both formId/personId are provided.
 */
export const GET = async (request: NextRequest) => {
  const { error: authError } = await requireSession()
  if (authError) return authError

  const params = request.nextUrl.searchParams
  const firstName = params.get('firstName') ?? ''
  const lastName = params.get('lastName') ?? ''
  const email = params.get('email') ?? ''
  const formId = params.get('formId') ?? ''
  const personId = params.get('personId') ?? ''

  try {
    const client = new AureHalAPIClient()
    const [affiliations, publicationCount] = await Promise.all([
      client.getAuthorStructures(firstName, lastName, email),
      client.getAuthorPublicationCount(formId, personId),
    ])
    return NextResponse.json({ affiliations, publicationCount })
  } catch (error) {
    console.error('❌ Error enriching HAL author profile:', error)
    return NextResponse.json(
      { error: 'Failed to query HAL author profile' },
      { status: 502 },
    )
  }
}
