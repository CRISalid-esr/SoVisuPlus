import { NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { DocumentService } from '@/lib/services/DocumentService'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { HalDepositStatus } from '@prisma/client'

type RouteContext = { params: Promise<{ depositId: string }> }

/** Statuses for which an on-demand status refresh makes sense (the deposit lives on the HAL side). */
const REFRESHABLE: HalDepositStatus[] = [
  HalDepositStatus.verify,
  HalDepositStatus.update,
  HalDepositStatus.delete,
]

/** Log why a refresh request is refused, then return the error response. */
const refuse = (
  status: number,
  error: string,
  context: Record<string, unknown>,
) => {
  console.warn(`⚠️ HAL deposit refresh refused (${status}): ${error}`, context)
  return NextResponse.json({ error }, { status })
}

export const POST = async (_request: Request, context: RouteContext) => {
  const session = (await getServerSession(authOptions)) as Session & {
    user: { username?: string }
  }
  if (!session?.user?.username) {
    return refuse(401, 'User is not authenticated', {})
  }
  const username = session.user.username

  try {
    const { depositId } = await context.params
    const id = Number(depositId)
    if (!Number.isInteger(id)) {
      return refuse(400, 'Invalid deposit id', { username, depositId })
    }

    const service = new DocumentService()
    const deposit = await service.getHalDepositById(id)
    if (!deposit) {
      return refuse(404, 'Deposit not found', { username, depositId: id })
    }

    const person = await service.getPersonByUid(deposit.personUid)
    // Same rule as deposit creation: either deposit permission on the deposit's person.
    const ability = abilityFromAuthzContext(session.user.authz)
    if (!person) {
      return refuse(403, 'Deposit person not found', {
        username,
        depositId: id,
        personUid: deposit.personUid,
      })
    }
    if (
      !ability.can(PermissionAction.deposit_hal, person) &&
      !ability.can(PermissionAction.deposit_hal_unauthenticated, person)
    ) {
      return refuse(403, 'Not allowed', {
        username,
        depositId: id,
        personUid: deposit.personUid,
        roles: session.user.authz?.roles ?? [],
      })
    }

    if (!REFRESHABLE.includes(deposit.status)) {
      return refuse(
        409,
        `Cannot refresh a deposit in status ${deposit.status}`,
        {
          username,
          depositId: id,
        },
      )
    }

    await service.requestDepositRefresh(id)
    return NextResponse.json({ success: true }, { status: 202 })
  } catch (error) {
    console.error('❌ Error requesting HAL deposit refresh:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
