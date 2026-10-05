import { NextResponse } from 'next/server'
import { requireSession } from '@/app/auth/requireSession'
import { ActionDAO } from '@/lib/daos/ActionDAO'
import { ActionTargetType, ActionType } from '@/types/Action'
import { UserDAO } from '@/lib/daos/UserDAO'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { PersonDAO } from '@/lib/daos/PersonDAO'

export const POST = async (request: Request) => {
  const { session, error: authError } = await requireSession()
  if (authError) return authError

  const { personUid, platforms } = await request.json()

  if (!personUid || !Array.isArray(platforms)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const userDAO = new UserDAO()
    const user = await userDAO.getUserByIdentifier(
      new PersonIdentifier(PersonIdentifierType.local, session.user.username),
    )

    if (!user?.person?.uid) {
      return NextResponse.json({ error: 'Unknown user' }, { status: 403 })
    }
    const personDAO = new PersonDAO()
    const targetPerson = await personDAO.fetchPersonByUid(personUid)
    if (!targetPerson) {
      return NextResponse.json(
        { error: 'Unknown target person' },
        { status: 404 },
      )
    }

    const ability = abilityFromAuthzContext(session?.user.authz)
    const canFetch = ability.can(PermissionAction.fetch_documents, targetPerson)
    if (!canFetch) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
