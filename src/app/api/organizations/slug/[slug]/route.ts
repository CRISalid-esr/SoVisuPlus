import { NextRequest, NextResponse } from 'next/server'
import { OrganizationUnitService } from '@/lib/services/OrganizationUnitService'

export const GET = async (
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) => {
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

    return NextResponse.json(organizationUnit)
  } catch (error) {
    console.error(`Error fetching organization unit by slug: ${slug}`, error)
    return NextResponse.json(
      { error: 'Failed to fetch organization unit by slug' },
      { status: 500 },
    )
  }
}
