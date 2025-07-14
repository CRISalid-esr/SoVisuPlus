import { NextResponse } from 'next/server'
import { DocumentService } from '@/lib/services/DocumentService'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'

export async function DELETE(
  request: Request,
  context: { params: Promise<{ uid: string }> },
) {
  const { uid } = await context.params

  // TODO implement access control !
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

  if (!uid) {
    return NextResponse.json(
      { error: 'Document UID is required' },
      { status: 400 },
    )
  }

  try {
    const body = await request.json()
    const conceptUids: string[] = body.conceptUids

    if (!Array.isArray(conceptUids) || conceptUids.length === 0) {
      return NextResponse.json(
        { error: 'conceptUids must be a non-empty array' },
        { status: 400 },
      )
    }

    const documentService = new DocumentService()
    await documentService.deleteConceptsFromDocument(uid, conceptUids, userName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error deleting concepts from document:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
