import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/app/auth/requireSession'
import { OrcidPublicClient } from '@/lib/services/OrcidPublicClient'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { withIdentifierUsage } from '@/lib/identifiers/identifierUsage'

const ORCID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i

type RouteContext = { params: Promise<{ orcid: string }> }

/**
 * Look up an ORCID public profile, to preview and confirm a manually entered
 * ORCID before it is added on the account page (mirrors /api/idref/[id] and
 * /api/aurehal/author). With `personUid`, also tells whether another person
 * already holds this ORCID (`usedByAnotherPerson`).
 */
export const GET = async (req: NextRequest, context: RouteContext) => {
  const { error: authError } = await requireSession()
  if (authError) return authError

  const { orcid } = await context.params
  const normalized = ORCIDIdentifier.normalize(orcid)
  if (!ORCID_REGEX.test(normalized)) {
    return NextResponse.json({ error: 'Invalid ORCID' }, { status: 400 })
  }
  const personUid = req.nextUrl.searchParams.get('personUid')?.trim()

  const client = new OrcidPublicClient()
  let data
  try {
    data = await client.fetchPerson(normalized)
  } catch (error) {
    console.error(`❌ Error looking up ORCID ${normalized}:`, error)
    return NextResponse.json({ error: 'ORCID service error' }, { status: 502 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    // Stored with an uppercase 'X' check digit (see the identifiers route)
    return NextResponse.json(
      await withIdentifierUsage(data, personUid, [
        new PersonIdentifier(
          PersonIdentifierType.orcid,
          normalized.toUpperCase(),
        ),
      ]),
    )
  } catch (error) {
    console.error(`❌ Error checking ORCID ${normalized} usage:`, error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
