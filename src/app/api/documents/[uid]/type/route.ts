// file: src/app/api/documents/[uid]/type/route.ts
import { NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { DocumentService } from '@/lib/services/DocumentService'
import { DocumentTypeService } from '@/lib/services/DocumentTypeService'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'

export const PUT = async (
  request: Request,
  context: { params: Promise<{ uid: string }> },
) => {
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
    const ability = abilityFromAuthzContext(session?.user.authz)
    const document = await documentService.fetchDocumentById(uid)
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    const canUpdateDocumentType = ability.can(
      PermissionAction.update,
      document!,
      'documentType',
    )
    if (!canUpdateDocumentType) {
      return NextResponse.json(
        { error: 'Logged user cannot update document type' },
        { status: 403 },
      )
    }
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
