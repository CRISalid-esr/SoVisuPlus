import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const searchTerm = urlParams.get('searchTerm') || ''
  const page = parseInt(urlParams.get('page') || '1', 10)
  const itemsPerPage = 10

  try {
    const searchTerms = searchTerm.trim().split(/\s+/)
    const searchCriteria = searchTerms.map((term) => ({
      OR: [
        {
          firstName: {
            contains: term,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: term,
            mode: 'insensitive',
          },
        },
      ],
    }))

    // Fetch people matching the search criteria
    const people = await prisma.person.findMany({
      where: {
        AND: searchCriteria, // Match all terms
      },
      skip: (page - 1) * itemsPerPage,
      take: itemsPerPage,
      orderBy: {
        lastName: 'asc',
      },
    })

    // Count total results for pagination
    const peopleCount = await prisma.person.count({
      where: {
        AND: searchCriteria,
      },
    })
    return NextResponse.json({
      people,
      total: peopleCount,
      hasMore: peopleCount > page * itemsPerPage,
    })
  } catch (error) {
    console.error('Error fetching people:', error)
    return NextResponse.json(
      { error: 'Failed to fetch people. Please try again later.' },
      { status: 500 },
    )
  }
}
