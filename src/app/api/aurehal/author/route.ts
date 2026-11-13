import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/app/auth/requireSession'
import {
  AureHalAPIClient,
  IdHalKind,
  idHalFormsOf,
} from '@/lib/services/AureHalAPIClient'
import { withIdentifierUsage } from '@/lib/identifiers/identifierUsage'
import { idHalFormsToIdentifiers } from '@/types/PersonIdentifier'

const isIdHalKind = (v: string | null): v is IdHalKind =>
  v === 'idhals' || v === 'idhali'

/**
 * Look up a HAL author profile by idHAL, to preview and confirm a manually
 * entered idHAL before it is added on the account page (mirrors /api/idref/[id]).
 * With `personUid`, also tells whether another person already holds this HAL
 * account, under either idHAL form (`usedByAnotherPerson`).
 */
export const GET = async (req: NextRequest) => {
  const { error: authError } = await requireSession()
  if (authError) return authError

  const value = req.nextUrl.searchParams.get('value')?.trim()
  const kind = req.nextUrl.searchParams.get('kind')
  const personUid = req.nextUrl.searchParams.get('personUid')?.trim()
  if (!value || !isIdHalKind(kind)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const client = new AureHalAPIClient()
  let author
  try {
    author = await client.findAuthorByIdHal(value, kind)
  } catch (error) {
    console.error(`❌ Error looking up idHAL ${kind}=${value}:`, error)
    return NextResponse.json(
      { error: 'AureHAL service error' },
      { status: 502 },
    )
  }
  if (!author) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    return NextResponse.json(
      await withIdentifierUsage(
        author,
        personUid,
        idHalFormsToIdentifiers(idHalFormsOf(author)),
      ),
    )
  } catch (error) {
    console.error(`❌ Error checking idHAL ${kind}=${value} usage:`, error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
