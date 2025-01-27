import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import QueryMode = Prisma.QueryMode

export const GET = async (req: NextRequest) => {
  try {
    const urlParams = req.nextUrl.searchParams
    const searchTerm = urlParams.get('searchTerm') || ''
    const page = urlParams.get('page') || '1'
    const pageNumber = page ? parseInt(page as string, 10) : 1
    const pageSize = parseInt(urlParams.get('pageSize') || '10', 10)
    const lang = urlParams.get('searchLang') || 'en'
    const columnFilters = urlParams.get('columnFilters')
      ? JSON.parse(urlParams.get('columnFilters') || '[]')
      : []
    const sorting = urlParams.get('sorting')
      ? JSON.parse(urlParams.get('sorting') || '[]')
      : []
    const skip = (pageNumber - 1) * Number(pageSize)

    const where: Prisma.DocumentWhereInput = {}

    if (searchTerm) {
      where['OR'] = [
        {
          titles: {
            some: {
              language: lang,
              value: {
                contains: searchTerm,
                mode: QueryMode.insensitive,
              },
            },
          },
        },
      ]
    }

    columnFilters.forEach((filter: { id: string; value: string }) => {
      const { id, value } = filter

      switch (id) {
        case 'titles':
          where['titles'] = {
            some: {
              language: lang,
              value: { contains: value, mode: QueryMode.insensitive },
            },
          }
          break
        default:
          break
      }
    })

    const orderBy: { [x: string]: string } = {}
    sorting.forEach((sort: { id: string; desc: boolean }) => {
      const { id, desc } = sort
      if (id) {
        orderBy[id] = desc ? 'desc' : 'asc'
      }
    })

    const documents = await prisma.document.findMany({
      where,
      skip,
      orderBy,
      take: pageSize,
      include: {
        titles: true,
        abstracts: true,
        contributions: {
          include: {
            person: true,
          },
        },
      },
    })

    const totalDocuments = await prisma.document.count({ where })

    return NextResponse.json({
      documents,
      totalItems: totalDocuments,
      page: pageNumber,
      limit: pageSize,
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
