import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const GET = async (req: NextRequest) => {
  try {
    // Parse query parameters for pagination, search, and sorting
    const urlParams = req.nextUrl.searchParams
    const searchTerm = urlParams.get('searchTerm') || ''
    const page = urlParams.get('page') || '1'
    const pageNumber = page ? parseInt(page as string, 10) : 1
    const pageSize = parseInt(urlParams.get('pageSize') || '10', 10)
    const lang = urlParams.get('searchLang') || 'en'
    const columnFilters = urlParams.get('columnFilters')
      ? JSON.parse(urlParams.get('columnFilters') || '[]')
      : [] // Column-specific filters
    const sorting = urlParams.get('sorting')
      ? JSON.parse(urlParams.get('sorting') || '[]')
      : [] // Sorting parameters
    const skip = (pageNumber - 1) * Number(pageSize)

    // Prepare Prisma `where` condition for search
    const where: any = {}

    if (searchTerm) {
      where.OR = [
        {
          titles: {
            path: [lang],
            string_contains: searchTerm.toLowerCase() as string,
          },
        },
      ]
    }

    // Apply column-specific filters (if any)
    columnFilters.forEach((filter) => {
      const { id, value } = filter
      if (value) {
        where[id] = { contains: value, mode: 'insensitive' }
      }
    })

    const orderBy: any = {}
    sorting.forEach((sort) => {
      const { id, desc } = sort
      if (id) {
        // Apply dynamic sorting directly using the id (e.g., 'titles.fr', 'titles.en', etc.)
        orderBy[id] = desc ? 'desc' : 'asc' // Use the provided id directly for sorting
      }
    })

    // Fetch documents with pagination, search, and sorting
    const documents = await prisma.document.findMany({
      where,
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
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
