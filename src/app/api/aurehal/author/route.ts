import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/app/auth/requireSession'
import { AureHalAPIClient, IdHalKind } from '@/lib/services/AureHalAPIClient'

const isIdHalKind = (v: string | null): v is IdHalKind =>
  v === 'idhals' || v === 'idhali'

/**
 * Look up a HAL author profile by idHAL, to preview and confirm a manually
 * entered idHAL before it is added on the account page (mirrors /api/idref/[id]).
 */
export const GET = async (req: NextRequest) => {
  const { error: authError } = await requireSession()
  if (authError) return authError

  const value = req.nextUrl.searchParams.get('value')?.trim()
  const kind = req.nextUrl.searchParams.get('kind')
  if (!value || !isIdHalKind(kind)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const client = new AureHalAPIClient()
  try {
    const author = await client.findAuthorByIdHal(value, kind)
    if (!author) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(author)
  } catch (error) {
    console.error(`❌ Error looking up idHAL ${kind}=${value}:`, error)
    return NextResponse.json(
      { error: 'AureHAL service error' },
      { status: 502 },
    )
  }
}
