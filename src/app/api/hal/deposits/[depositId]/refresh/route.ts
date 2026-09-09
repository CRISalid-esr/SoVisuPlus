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

export const POST = async (_request: Request, context: RouteContext) => {
  const session = (await getServerSession(authOptions)) as Session & {
    user: { username?: string }
  }
  if (!session?.user?.username) {
    return NextResponse.json(
      { error: 'User is not authenticated' },
      { status: 401 },
    )
  }

  try {
    const { depositId } = await context.params
    const id = Number(depositId)
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: 'Invalid deposit id' }, { status: 400 })
    }

    const service = new DocumentService()
    const deposit = await service.getHalDepositById(id)
    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }

    const person = await service.getPersonByUid(deposit.personUid)
    const ability = abilityFromAuthzContext(session.user.authz)
    if (!person || !ability.can(PermissionAction.deposit_hal, person)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }

    if (!REFRESHABLE.includes(deposit.status)) {
      return NextResponse.json(
        { error: `Cannot refresh a deposit in status ${deposit.status}` },
        { status: 409 },
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
