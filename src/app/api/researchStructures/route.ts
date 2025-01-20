import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const searchTerm = urlParams.get('searchTerm') || ''
  const page = urlParams.get('page') || '1'
  const pageNumber = page ? parseInt(page as string, 10) : 1
  const itemsPerPage = 10
  const lang = urlParams.get('searchLang') || 'en'

  // Prisma does not support case insensitive search at the moment
  // https://github.com/prisma/prisma/issues/7390
  try {
    const researchStructures = await prisma.researchStructure.findMany({
      where: {
        OR: [
          {
            names: {
              path: [lang],
              string_contains: searchTerm.toLowerCase() as string,
            },
          },
          {
            names: {
              path: [lang],
              string_contains: searchTerm.toUpperCase() as string,
            },
          },
        ],
      },
      skip: (pageNumber - 1) * itemsPerPage,
      take: itemsPerPage,
      orderBy: {
        names: 'asc',
      },
    })

    const researchStructuresCount = await prisma.researchStructure.count({
      where: {
        OR: [
          {
            names: {
              path: [lang],
              string_contains: searchTerm.toLowerCase() as string,
            },
          },
          {
            names: {
              path: [lang],
              string_contains: searchTerm.toUpperCase() as string,
            },
          },
        ],
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
