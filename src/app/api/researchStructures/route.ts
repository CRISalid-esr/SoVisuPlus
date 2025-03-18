import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import QueryMode = Prisma.QueryMode

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const searchTerm = urlParams.get('searchTerm') || ''
  const page = urlParams.get('page') || '1'
  const pageNumber = parseInt(page, 10) || 1
  const itemsPerPage = 10
  const lang = urlParams.get('searchLang') || 'en'
  const includeExternal = urlParams.get('includeExternal') === 'true'

  try {
    const whereClause: Prisma.ResearchStructureWhereInput = {
      names: {
        some: {
          language: lang,
          value: {
            contains: searchTerm,
            mode: QueryMode.insensitive,
          },
        },
      },
    }

    if (!includeExternal) {
      whereClause.external = false
    }

    const researchStructures = await prisma.researchStructure.findMany({
      where: whereClause,
      skip: (pageNumber - 1) * itemsPerPage,
      take: itemsPerPage,
      select: {
        id: true,
        uid: true,
        acronym: true,
        names: {
          select: {
            value: true,
            language: true,
          },
        },
        slug: true,
      },
      orderBy: {
        names: {
          _count: 'asc',
        },
      },
    })

    const researchStructuresCount = await prisma.researchStructure.count({
      where: whereClause,
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
