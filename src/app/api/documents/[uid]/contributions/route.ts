import { NextResponse } from 'next/server'
import { DocumentService } from '@/lib/services/DocumentService'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { ContributionActionParameters } from '@/types/ContributionAction'

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
    const contributions: ContributionActionParameters[] = body.contributions

    // The full state may be empty (all contributors removed); only the shape is required.
    if (!Array.isArray(contributions)) {
      return NextResponse.json(
        { error: 'contributions must be an array' },
        { status: 400 },
      )
    }

    const documentService = new DocumentService()
    const ability = abilityFromAuthzContext(session?.user.authz)
    const document = await documentService.fetchDocumentById(uid)
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    const canUpdateDocumentContributors = ability.can(
      PermissionAction.update,
      document,
      'contributors',
    )
    if (!canUpdateDocumentContributors) {
      return NextResponse.json(
        { error: 'Logged user cannot update document contributors' },
        { status: 403 },
      )
    }

    // A user may not delete their own contribution (the UI hides the bin; this is
    // the server-side enforcement of the same rule). With a full-state payload that
    // means: they were a contributor on the document and are no longer in the
    // submitted list. Editors who were never contributors are not affected.
    const ownPersonUid = session?.user.authz?.personUid
    const wasContributor =
      !!ownPersonUid &&
      document.contributions.some((c) => c.person.uid === ownPersonUid)
    const stillContributor = contributions.some(
      (c) => c.person.uid === ownPersonUid,
    )
    if (wasContributor && !stillContributor) {
      return NextResponse.json(
        { error: 'A user cannot delete its own contribution' },
        { status: 403 },
      )
    }

    await documentService.saveContributions(uid, contributions, userName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error saving document contributions:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
