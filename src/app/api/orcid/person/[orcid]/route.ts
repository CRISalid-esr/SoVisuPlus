import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { OrcidPublicClient } from '@/lib/services/OrcidPublicClient'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'

const ORCID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i

type RouteContext = { params: Promise<{ orcid: string }> }

/**
 * Look up an ORCID public profile, to preview and confirm a manually entered
 * ORCID before it is added on the account page (mirrors /api/idref/[id] and
 * /api/aurehal/author).
 */
export const GET = async (_req: NextRequest, context: RouteContext) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.authz) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orcid } = await context.params
  const normalized = ORCIDIdentifier.normalize(orcid)
  if (!ORCID_REGEX.test(normalized)) {
    return NextResponse.json({ error: 'Invalid ORCID' }, { status: 400 })
  }

  const client = new OrcidPublicClient()
  try {
    const data = await client.fetchPerson(normalized)
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error(`❌ Error looking up ORCID ${normalized}:`, error)
    return NextResponse.json({ error: 'ORCID service error' }, { status: 502 })
  }
}
