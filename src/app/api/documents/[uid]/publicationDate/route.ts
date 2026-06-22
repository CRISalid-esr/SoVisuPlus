import { NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { DocumentService } from '@/lib/services/DocumentService'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { parsePublicationDate } from '@/utils/publicationDate'

const isValidPublicationDate = (value: unknown): value is string | null => {
  if (value === null) {
    return true
  }
  if (typeof value !== 'string' || !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(value)) {
    return false
  }
  return parsePublicationDate(value).day !== null
}

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
    if (!body || !isValidPublicationDate(body.publicationDate)) {
      return NextResponse.json(
        { error: 'Invalid or missing publicationDate' },
        { status: 400 },
      )
    }
    const publicationDate: string | null = body.publicationDate

    const documentService = new DocumentService()
    const ability = abilityFromAuthzContext(session?.user.authz)
    const document = await documentService.fetchDocumentById(uid)
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    const canUpdatePublicationDate = ability.can(
      PermissionAction.update,
      document,
      'publicationDate',
    )
    if (!canUpdatePublicationDate) {
      return NextResponse.json(
        { error: 'Logged user cannot update document publication date' },
        { status: 403 },
      )
    }
    await documentService.updatePublicationDate(uid, publicationDate, userName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error updating document publication date:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
