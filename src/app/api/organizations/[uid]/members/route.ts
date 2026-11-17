import { NextRequest, NextResponse } from 'next/server'
import {
  OrganizationUnitService,
  STRUCTURE_MEMBER_SORT_KEYS,
  STRUCTURE_MEMBER_VALIDATION_FILTERS,
  StructureMemberSort,
  StructureMemberSortKey,
  StructureMemberValidationFilter,
} from '@/lib/services/OrganizationUnitService'
import { EMPTY_PRINCIPAL } from '@/app/auth/ability'
import { canManageStructureVisibility } from '@/app/auth/structureVisibility'
import { requireSession } from '@/app/auth/requireSession'
import { MAX_NAME_SEARCH_QUERY_LENGTH } from '@/utils/fuzzySearch/constants'
import { searchQueryLengthError } from '@/utils/fuzzySearch/searchQueryLength'

const PAGE_SIZES = [10, 20, 50]

/**
 * Parses `sort=position,-name`: comma-separated keys by priority, `-` for a
 * descending order. Unknown and repeated keys are ignored.
 */
const parseSort = (value: string | null): StructureMemberSort[] => {
  const sort: StructureMemberSort[] = []
  for (const token of (value ?? '').split(',')) {
    const desc = token.startsWith('-')
    const key = desc ? token.slice(1) : token
    if (
      (STRUCTURE_MEMBER_SORT_KEYS as readonly string[]).includes(key) &&
      !sort.some((criterion) => criterion.key === key)
    ) {
      sort.push({ key: key as StructureMemberSortKey, desc })
    }
  }
  return sort
}

export const GET = async (
  req: NextRequest,
  context: { params: Promise<{ uid: string }> },
) => {
  const { session, error: authError } = await requireSession()
  if (authError) return authError

  const { uid } = await context.params
  const searchParams = req.nextUrl.searchParams

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const requestedPageSize = Number(searchParams.get('pageSize'))
  const pageSize = PAGE_SIZES.includes(requestedPageSize)
    ? requestedPageSize
    : PAGE_SIZES[0]
  const requestedValidation = searchParams.get('validation') ?? ''
  const validation = (
    STRUCTURE_MEMBER_VALIDATION_FILTERS as readonly string[]
  ).includes(requestedValidation)
    ? (requestedValidation as StructureMemberValidationFilter)
    : 'all'
  const search = searchParams.get('search') ?? ''

  const searchLengthError = searchQueryLengthError(
    [search],
    MAX_NAME_SEARCH_QUERY_LENGTH,
  )
  if (searchLengthError) {
    return NextResponse.json({ error: searchLengthError }, { status: 400 })
  }

  try {
    const organizationUnitService = new OrganizationUnitService()

    // The members of a hidden structure are only listed for the structure
    // managers who can still reach its detail panel.
    const visibility = await organizationUnitService.fetchVisibilityState(uid)
    if (visibility?.hiddenEffective) {
      if (!canManageStructureVisibility(session)) {
        return NextResponse.json(
          { error: `Structure ${uid} not found` },
          { status: 404 },
        )
      }
    }

    const result = await organizationUnitService.getStructureMembers({
      uid,
      present: searchParams.get('present') !== 'false',
      search,
      sort: parseSort(searchParams.get('sort')),
      validation,
      authz: session.user.authz ?? EMPTY_PRINCIPAL,
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
