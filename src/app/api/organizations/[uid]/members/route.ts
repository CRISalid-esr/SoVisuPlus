import { NextRequest, NextResponse } from 'next/server'
import {
  OrganizationUnitService,
  STRUCTURE_MEMBER_SORT_KEYS,
  StructureMemberSortKey,
} from '@/lib/services/OrganizationUnitService'

const PAGE_SIZES = [10, 20, 50]

export const GET = async (
  req: NextRequest,
  context: { params: Promise<{ uid: string }> },
) => {
  const { uid } = await context.params
  const searchParams = req.nextUrl.searchParams

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const requestedPageSize = Number(searchParams.get('pageSize'))
  const pageSize = PAGE_SIZES.includes(requestedPageSize)
    ? requestedPageSize
    : PAGE_SIZES[0]
  const requestedSortBy = searchParams.get('sortBy') ?? ''
  const sortBy = (STRUCTURE_MEMBER_SORT_KEYS as readonly string[]).includes(
    requestedSortBy,
  )
    ? (requestedSortBy as StructureMemberSortKey)
    : 'name'

  try {
    const result = await new OrganizationUnitService().getStructureMembers({
      uid,
      present: searchParams.get('present') !== 'false',
      search: searchParams.get('search') ?? '',
      sortBy,
      sortDesc: searchParams.get('sortDesc') === 'true',
      page,
      pageSize,
    })
    if (result === null) {
      return NextResponse.json(
        { error: `Structure ${uid} not found` },
        { status: 404 },
      )
    }
    return NextResponse.json({
      members: result.members.map((member) => member.toJson()),
      total: result.total,
    })
  } catch (error) {
    console.error(`Error fetching members of structure ${uid}:`, error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
