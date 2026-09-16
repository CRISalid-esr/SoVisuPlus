import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/app/auth/requireSession'
import { IdRefService } from '@/lib/services/IdRefService'

type RouteContext = { params: Promise<{ id: string }> }

export const GET = async (_req: NextRequest, context: RouteContext) => {
  const { error: authError } = await requireSession()
  if (authError) return authError

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
