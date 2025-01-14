import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const GET = async (req: NextRequest) => {
  const urlParams = req.nextUrl.searchParams
  const searchTerm = urlParams.get('search') || ''
  const page = urlParams.get('page') || '1'
  // Default pagination parameters
  const pageNumber = page ? parseInt(page as string, 10) : 1
  const itemsPerPage = 10

  try {
    // Fetch people from the database using Prisma
    const people = await prisma.person.findMany({
      where: {
        OR: [
          {
            firstName: {
              contains: searchTerm as string,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: searchTerm as string,
              mode: 'insensitive',
            },
          },
        ],
      },
      skip: (pageNumber - 1) * itemsPerPage,
      take: itemsPerPage,
      orderBy: {
        lastName: 'asc',
      },
    })

    const peopleCount = await prisma.person.count({
      where: {
        OR: [
          {
            firstName: {
              contains: searchTerm as string,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: searchTerm as string,
              mode: 'insensitive',
            },
          },
        ],
      },
    })
    return NextResponse.json({
      people: people,
      total: peopleCount,
      hasMore: peopleCount > pageNumber * itemsPerPage,
    })
  } catch (error) {
    console.error('Error fetching people:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
