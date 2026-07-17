import { NextRequest, NextResponse } from 'next/server'
import { OrganizationUnitService } from '@/lib/services/OrganizationUnitService'
import { ORGANIZATION_GROUPS, OrganizationGroup } from '@/types/IAgent'

const organizationUnitService = new OrganizationUnitService()

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const searchTerm = urlParams.get('searchTerm') || ''
  const group = urlParams.get('group')
  const page = urlParams.get('page') || '1'
  const pageNumber = parseInt(page, 10) || 1
  const itemsPerPage = 10

  if (!group || !ORGANIZATION_GROUPS.includes(group as OrganizationGroup)) {
    return NextResponse.json(
      {
        error: `Invalid group: must be one of ${ORGANIZATION_GROUPS.join(', ')}`,
      },
      { status: 400 },
    )
  }

  try {
    const { organizations, total } =
      await organizationUnitService.getOrganizationUnits({
        searchTerm,
        group: group as OrganizationGroup,
        pageNumber,
        itemsPerPage,
      })

    return NextResponse.json({
      organizations,
      total,
      hasMore: total > pageNumber * itemsPerPage,
    })
  } catch (error) {
    console.error('Error fetching organization units:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
