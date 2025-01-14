import prisma from '@/lib/prisma'
import { Person } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

export const GET = async (req: NextRequest, res: NextResponse) => {
  const urlParams = req.nextUrl.searchParams
  const searchTerm = urlParams.get('search') || ''
  const page = urlParams.get('page') || '1'
  // Default pagination parameters
  const pageNumber = page ? parseInt(page as string, 10) : 1
  const itemsPerPage = 10

  try {
    // Fetch persons from the database using Prisma
    const persons = await prisma.person.findMany({
      where: {
        OR: [
          {
            firstName: {
              contains: searchTerm as string,
              mode: 'insensitive', // Case-insensitive search
            },
          },
          {
            lastName: {
              contains: searchTerm as string,
              mode: 'insensitive', // Case-insensitive search
            },
          },
        ],
      },
      skip: (pageNumber - 1) * itemsPerPage,
      take: itemsPerPage,
      orderBy: {
        lastName: 'asc', // Optional: Order by last name
      },
    })
    // Count the total number of matching persons for pagination info (optional)
    const totalPersons = await prisma.person.count({
      where: {
        OR: [
          {
            firstName: {
              contains: searchTerm as string,
              mode: 'insensitive', // Case-insensitive search
            },
          },
          {
            lastName: {
              contains: searchTerm as string,
              mode: 'insensitive', // Case-insensitive search
            },
          },
        ],
      },
    })
    return NextResponse.json({
        persons,
        total: totalPersons,
        hasMore: totalPersons > pageNumber * itemsPerPage,
      });
  } catch (error) {
    console.error('Error fetching persons:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
