import { NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { ActionDAO } from '@/lib/daos/ActionDAO'
import { ActionTargetType, ActionType } from '@/types/Action'
import { UserDAO } from '@/lib/daos/UserDAO'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as Session & {
    user: { username?: string }
  }

  if (!session?.user?.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { personUid, platforms } = await request.json()

  if (!personUid || !Array.isArray(platforms)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const userDAO = new UserDAO()
    const user = await userDAO.getUserByIdentifier({
      type: PersonIdentifierType.LOCAL,
      value: session.user.username,
    })

    if (!user?.person?.uid) {
      return NextResponse.json({ error: 'Unknown user' }, { status: 403 })
    }

    const actionDAO = new ActionDAO()
    await actionDAO.createAction({
      actionType: ActionType.FETCH,
      targetType: ActionTargetType.HARVESTING,
      targetUid: personUid,
      path: undefined,
      parameters: { platforms },
      personUid: user.person.uid,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('❌ Error in /harvestings', err)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
