import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const searchTerm = urlParams.get('searchTerm') || ''
  const page = urlParams.get('page') || '1'
  // Default pagination parameters
  const pageNumber = page ? parseInt(page as string, 10) : 1
  const itemsPerPage = 10

  try {
    const researchStructures = await prisma.researchStructure.findMany({
      where: {
        names: {
          path: ['fr'],
          string_contains: searchTerm as string,
        },
      },
      skip: (pageNumber - 1) * itemsPerPage,
      take: itemsPerPage,
      orderBy: {
        names: 'asc',
      },
    })

    const researchStructuresCount = await prisma.researchStructure.count({
      where: {
        names: {
          path: ['fr'],
          string_contains: searchTerm as string,
        },
      },
    })

    return NextResponse.json({
      researchStructures,
      total: researchStructuresCount,
      hasMore: researchStructuresCount > pageNumber * itemsPerPage,
    })
  } catch (error) {
    console.error('Error fetching research structures:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
