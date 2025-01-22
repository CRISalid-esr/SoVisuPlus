import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const GET = async (request: Request) => {
  try {
    // Parse query parameters for pagination, search, and sorting
    const {
      search,
      sortBy,
      sortOrder,
      page = '1',
      limit = '10',
      column,
    } = Object.fromEntries(new URL(request.url).searchParams)

    const pageNumber = parseInt(page, 10)
    const pageSize = parseInt(limit, 10)
    const skip = (pageNumber - 1) * pageSize

    // Prepare Prisma `where` condition for search
    const where: any = {}

    if (search && column) {
      where[column] = { contains: search, mode: 'insensitive' }
    } else if (search) {
      // Full-text search across multiple columns
      where.OR = [
        { uid: { contains: search, mode: 'insensitive' } },
        {
          titles: {
            path: '$.default',
            string_contains: search,
            mode: 'insensitive',
          },
        }, // Assuming `default` key in JSON
      ]
    }

    // Fetch documents with pagination, search, and sorting
    const documents = await prisma.document.findMany({
      where,
      orderBy:
        sortBy && sortOrder
          ? { [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' }
          : undefined,
      skip,
      take: pageSize,
      include: {
        persons: {
          include: {
            person: true, // Include associated Person data
          },
        },
      },
    })

    // Count total documents matching the criteria
    const totalDocuments = await prisma.document.count({ where })

    return NextResponse.json({
      documents,
      totalItems: totalDocuments,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(totalDocuments / pageSize),
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
