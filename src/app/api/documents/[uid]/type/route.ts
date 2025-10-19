// file: src/app/api/documents/[uid]/type/route.ts
import { NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { DocumentService } from '@/lib/services/DocumentService'
import { DocumentTypeService } from '@/lib/services/DocumentTypeService'

export async function PUT(
  request: Request,
  context: { params: Promise<{ uid: string }> },
) {
  try {
    const { uid } = await context.params

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

    const body = await request.json().catch(() => null)
    const documentType = DocumentTypeService.isDocumentType(body?.documentType)
      ? body.documentType
      : null

    if (!documentType) {
      return NextResponse.json(
        { error: 'Invalid or missing documentType' },
        { status: 400 },
      )
    }

    const documentService = new DocumentService()
    await documentService.updateDocumentType(uid, documentType, userName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error updating document type:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
