import { NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { DocumentService } from '@/lib/services/DocumentService'

export async function POST(request: Request) {
  // TODO implement access control / authorization by perspective
  const session = (await getServerSession(authOptions)) as Session & {
    user: { username?: string }
  }
  const userName = session?.user?.username
  if (!userName) {
    return NextResponse.json(
      { error: 'User is not authenticated' },
      { status: 401 },
    )
  }

  try {
    const body = await request.json()
    const documentUids: unknown = body?.documentUids

    if (!Array.isArray(documentUids)) {
      return NextResponse.json(
        { error: 'documentUids must be an array' },
        { status: 400 },
      )
    }

    // check there are at least two distinct, non-empty UIDs
    const uniqueUids = [...new Set(documentUids.filter(Boolean))]
    if (uniqueUids.length < 2) {
      return NextResponse.json(
        { error: 'At least two distinct document UIDs are required' },
        { status: 400 },
      )
    }

    // Fire-and-forget: enqueue merge in the graph;
    // the actual DB and UI update will arrive via RabbitMQ later.
    const service = new DocumentService()
    await service.mergeDocuments(uniqueUids, userName)

    // 202 Accepted since the merge will be processed asynchronously.
    return NextResponse.json({ success: true, queued: true }, { status: 202 })
  } catch (error) {
    console.error('❌ Error merging documents:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
