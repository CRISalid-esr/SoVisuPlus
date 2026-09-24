import { NextRequest, NextResponse } from 'next/server'
import { PersonService } from '@/lib/services/PersonService'
import { MAX_NAME_SEARCH_QUERY_LENGTH } from '@/utils/fuzzySearch/constants'
import { searchQueryLengthError } from '@/utils/fuzzySearch/searchQueryLength'

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const searchTerm = urlParams.get('searchTerm') || ''
  const page = parseInt(urlParams.get('page') || '1', 10)
  const includeExternal = urlParams.get('includeExternal') === 'true'
  const itemsPerPage = 10

  const searchLengthError = searchQueryLengthError(
    [searchTerm],
    MAX_NAME_SEARCH_QUERY_LENGTH,
  )
  if (searchLengthError) {
    return NextResponse.json({ error: searchLengthError }, { status: 400 })
  }

  const personService = new PersonService()

  try {
    const { people, total, hasMore } = await personService.fetchPeople(
      searchTerm,
      page,
      includeExternal,
      itemsPerPage,
    )

    return NextResponse.json({
      people,
      total,
      hasMore,
    })
  } catch (error) {
    console.error('Error fetching people:', error)
    return NextResponse.json(
      { error: 'Failed to fetch people. Please try again later.' },
      { status: 500 },
    )
  }
}
