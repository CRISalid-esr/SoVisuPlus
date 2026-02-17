import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { NextResponse } from 'next/server'
import { DocumentService } from '@/lib/services/DocumentService'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { LiteralJson } from '@/types/Literal'

export const PUT = async (
  request: Request,
  context: { params: Promise<{ uid: string }> },
) => {
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

  try {
    const body = await request.json()
    const abstracts: LiteralJson[] = body.abstracts

    if (!Array.isArray(abstracts) || abstracts.length === 0) {
      return NextResponse.json(
        { error: 'abstracts must be a non-empty array' },
        { status: 400 },
      )
    }

    const documentService = new DocumentService()
    const ability = abilityFromAuthzContext(session?.user.authz)
    const document = await documentService.fetchDocumentById(uid)
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    const canUpdateDocumentAbstracts = ability.can(
      PermissionAction.update,
      document!,
      'abstracts',
    )
    if (!canUpdateDocumentAbstracts) {
      return NextResponse.json(
        { error: 'Logged user cannot update document abstracts' },
        { status: 403 },
      )
    }
    await documentService.modifyAbstracts(document, abstracts, userName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error modifying abstracts from document:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
