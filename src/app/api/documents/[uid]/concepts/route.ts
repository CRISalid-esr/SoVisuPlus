import { NextResponse } from 'next/server'
import { DocumentService } from '@/lib/services/DocumentService'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { ConceptJson } from '@/types/Concept'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'

export const DELETE = async (
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
    const conceptUids: string[] = body.conceptUids

    if (!Array.isArray(conceptUids) || conceptUids.length === 0) {
      return NextResponse.json(
        { error: 'conceptUids must be a non-empty array' },
        { status: 400 },
      )
    }

    const documentService = new DocumentService()
    const ability = abilityFromAuthzContext(session?.user.authz)
    const document = await documentService.fetchDocumentById(uid)
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    const canUpdateDocumentSubjects = ability.can(
      PermissionAction.update,
      document!,
      'subjects',
    )
    if (!canUpdateDocumentSubjects) {
      return NextResponse.json(
        { error: 'Logged user cannot update document subjects' },
        { status: 403 },
      )
    }
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

export const POST = async (
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
    const concepts: ConceptJson[] = body.concepts

    if (!Array.isArray(concepts) || concepts.length === 0) {
      return NextResponse.json(
        { error: 'concepts must be a non-empty array' },
        { status: 400 },
      )
    }

    const documentService = new DocumentService()
    const ability = abilityFromAuthzContext(session?.user.authz)
    const document = await documentService.fetchDocumentById(uid)
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    const canUpdateDocumentSubjects = ability.can(
      PermissionAction.update,
      document!,
      'subjects',
    )
    if (!canUpdateDocumentSubjects) {
      return NextResponse.json(
        { error: 'Logged user cannot update document subjects' },
        { status: 403 },
      )
    }
    await documentService.addConceptsToDocument(uid, concepts, userName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error adding concepts from document:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
