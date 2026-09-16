import { NextRequest, NextResponse } from 'next/server'
import { OrganizationUnitService } from '@/lib/services/OrganizationUnitService'
import { canManageStructureVisibility } from '@/app/auth/structureVisibility'
import { requireSession } from '@/app/auth/requireSession'

export const GET = async (
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) => {
  const { session, error: authError } = await requireSession()
  if (authError) return authError

  const { slug } = await context.params
  const organizationUnitService = new OrganizationUnitService()

  try {
    const organizationUnit =
      await organizationUnitService.fetchOrganizationUnitBySlug(slug)
    if (!organizationUnit) {
      return NextResponse.json(
        { error: `OrganizationUnit with slug ${slug} not found` },
        { status: 404 },
      )
    }

    // A hidden structure is not a perspective: its dashboard stays reachable
    // for the structure managers who can see it in the directory, and looks
    // like a dead link to everyone else.
    if (organizationUnit.hiddenEffective) {
      if (!canManageStructureVisibility(session)) {
        return NextResponse.json(
          { error: `OrganizationUnit with slug ${slug} not found` },
          { status: 404 },
        )
      }
    }

    return NextResponse.json(organizationUnit)
  } catch (error) {
    console.error(`Error fetching organization unit by slug: ${slug}`, error)
    return NextResponse.json(
      { error: 'Failed to fetch organization unit by slug' },
      { status: 500 },
    )
  }
}
