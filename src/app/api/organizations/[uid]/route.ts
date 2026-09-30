import { NextResponse } from 'next/server'
import { OrganizationUnitService } from '@/lib/services/OrganizationUnitService'
import { canManageStructureVisibility } from '@/app/auth/structureVisibility'
import { requireSession } from '@/app/auth/requireSession'

/**
 * Show or hide a structure in the research-structures directory.
 *
 * Hiding cascades to the descendants reachable only through this structure;
 * the resulting effective flag is returned so the caller can reflect it
 * without guessing the rule.
 */
export const PATCH = async (
  request: Request,
  context: { params: Promise<{ uid: string }> },
) => {
  const { session, error: authError } = await requireSession()
  if (authError) return authError

  const { uid } = await context.params

  if (!canManageStructureVisibility(session)) {
    return NextResponse.json(
      { error: 'Logged user cannot change structure visibility' },
      { status: 403 },
    )
  }

  try {
    const body = await request.json()
    const { hidden } = body
    if (typeof hidden !== 'boolean') {
      return NextResponse.json(
        { error: 'hidden must be a boolean' },
        { status: 400 },
      )
    }

    const updated = await new OrganizationUnitService().setHidden(uid, hidden)
    if (!updated) {
      return NextResponse.json(
        { error: `Structure ${uid} not found` },
        { status: 404 },
      )
    }
    return NextResponse.json(updated)
  } catch (error) {
    console.error(`Error updating visibility of structure ${uid}:`, error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
