import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/app/auth/requireSession'
import { IdRefService } from '@/lib/services/IdRefService'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { withIdentifierUsage } from '@/lib/identifiers/identifierUsage'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Look up an IdRef record, to preview and confirm a manually entered IdRef
 * before it is added on the account page. With `personUid`, also tells
 * whether another person already holds this IdRef (`usedByAnotherPerson`).
 */
export const GET = async (req: NextRequest, context: RouteContext) => {
  const { error: authError } = await requireSession()
  if (authError) return authError

  const { id } = await context.params
  const personUid = req.nextUrl.searchParams.get('personUid')?.trim()

  const service = new IdRefService()
  let data
  try {
    data = await service.fetchPerson(id)
  } catch (error) {
    const status = (error as Error & { status?: number }).status
    if (status === 404) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error(`❌ Error fetching IdRef record for ${id}:`, error)
    return NextResponse.json({ error: 'IdRef service error' }, { status: 502 })
  }

  try {
    // Stored with an uppercase 'X' check digit (see the identifiers route)
    return NextResponse.json(
      await withIdentifierUsage(data, personUid, [
        new PersonIdentifier(PersonIdentifierType.idref, id.toUpperCase()),
      ]),
    )
  } catch (error) {
    console.error(`❌ Error checking IdRef ${id} usage:`, error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
