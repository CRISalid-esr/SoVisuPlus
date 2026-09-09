import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { IdRefService } from '@/lib/services/IdRefService'

type RouteContext = { params: Promise<{ id: string }> }

export const GET = async (_req: NextRequest, context: RouteContext) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.authz) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  const service = new IdRefService()
  try {
    const data = await service.fetchPerson(id)
    return NextResponse.json(data)
  } catch (error) {
    const status = (error as Error & { status?: number }).status
    if (status === 404) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error(`❌ Error fetching IdRef record for ${id}:`, error)
    return NextResponse.json({ error: 'IdRef service error' }, { status: 502 })
  }
}
