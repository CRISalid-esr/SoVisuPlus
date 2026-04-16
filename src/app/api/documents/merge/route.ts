import { NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { DocumentService } from '@/lib/services/DocumentService'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'

export const POST = async (request: Request) => {
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
    const documentUids: string[] = body?.documentUids

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
    // the actual DB and UI update will arrive via RabbitMQ later
    // for now, the document are just marked as "waiting for update"
    const service = new DocumentService()

    //get all documents
    const documents = await Promise.all(
      uniqueUids.map(async (uid) => {
        const document = await service.fetchDocumentById(uid)
        return { document: document, uid: uid }
      }),
    )

    const ability = abilityFromAuthzContext(session?.user.authz)

    //sort their uid in three categories : unfound documents in database (null), out of scope ones (check by ability.can) and others
    const [notFounds, notAllowed, rightUids] = documents.reduce<
      [string[], string[], string[]]
    >(
      ([notFounds, notAllowed, rightUids], document) => {
        if (!document.document) {
          notFounds.push(document.uid)
        } else {
          const canMergeDocument = ability.can(
            PermissionAction.merge,
            document.document!,
          )
          if (!canMergeDocument) {
            notAllowed.push(document.uid)
          } else {
            rightUids.push(document.uid)
          }
        }
        return [notFounds, notAllowed, rightUids]
      },
      [[], [], []],
    )

    //error for unfound and out of scope documents present at the same time
    if (notFounds.length > 0 && notAllowed.length > 0) {
      return NextResponse.json(
        {
          error:
            'Documents with uids ' +
            notFounds.join(', ') +
            ' not found and documents with uids ' +
            notAllowed.join(', ') +
            ' cannot be merged by user',
        },
        { status: 400 },
      )
      //error for unfound documents presence only
    } else if (notFounds.length > 0) {
      return NextResponse.json(
        { error: 'Documents with uids ' + notFounds.join(', ') + ' not found' },
        { status: 404 },
      )
      //error for out of scope documents presence only
    } else if (notAllowed.length > 0) {
      return NextResponse.json(
        {
          error:
            'Logged user cannot merge documents with uids ' +
            notAllowed.join(', '),
        },
        { status: 403 },
      )
    }

    const { updated } = await service.mergeDocuments(rightUids, userName)

    return NextResponse.json(
      { success: true, queued: true, updated }, // [{ uid, state }]
      { status: 200 },
    )
  } catch (error) {
    console.error('❌ Error merging documents:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
