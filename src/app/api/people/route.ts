import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { PersonService } from '@/lib/services/PersonService'

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const searchTerm = urlParams.get('searchTerm') || ''
  const page = parseInt(urlParams.get('page') || '1', 10)
  const includeExternal = urlParams.get('includeExternal') === 'true'
  const itemsPerPage = 10

  const personService = new PersonService()

  try {
    const {
      people,
      total: peopleCount,
      hasMore,
    } = await personService.fetchPeople({
      searchTerm,
      page,
      includeExternal,
      itemsPerPage,
    })

    return NextResponse.json({
      people,
      total: peopleCount,
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
