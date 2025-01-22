import { GET } from './route'
import prisma from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { Person } from '@/types/Person'
// Mock Prisma Client
jest.mock('@/lib/prisma', () => ({
  person: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
}))

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => {
      return {
        json: async () => data,
        status: init?.status ?? 200,
      }
    }),
  },
}))

type MockNextRequest = {
  nextUrl: {
    searchParams: URLSearchParams
  }
} & Partial<Omit<NextRequest, 'nextUrl'>>

describe('GET /api/people', () => {
  it('should return a list of people matching the search criteria', async () => {
    const mockPeople = [
      { firstName: 'John', lastName: 'Doe' },
      { firstName: 'Jane', lastName: 'Smith' },
    ]
    const mockCount = 2

    // Mock Prisma's findMany and count to return mock data
    ;(prisma.person.findMany as jest.Mock).mockResolvedValueOnce(mockPeople)
    ;(prisma.person.count as jest.Mock).mockResolvedValueOnce(mockCount)

    const mockRequest: MockNextRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('searchTerm=John&page=1'),
      },
    }

    const response = await GET(mockRequest as unknown as NextRequest)

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.people).toEqual(mockPeople)
    expect(data.total).toBe(mockCount)
    expect(data.hasMore).toBe(false)
  })

  it('should return empty result when no people are found', async () => {
    const mockPeople: Person[] = []
    const mockCount = 0

    // Mock Prisma's findMany and count to return empty result
    ;(prisma.person.findMany as jest.Mock).mockResolvedValueOnce(mockPeople)
    ;(prisma.person.count as jest.Mock).mockResolvedValueOnce(mockCount)

    const mockRequest: MockNextRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('searchTerm=John&page=1'),
      },
    }

    const response = await GET(mockRequest as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.people).toEqual(mockPeople)
    expect(data.total).toBe(mockCount)
    expect(data.hasMore).toBe(false)
  })

  it('should return a 500 error when Prisma throws an error', async () => {
    // Mock Prisma's findMany to throw an error
    ;(prisma.person.findMany as jest.Mock).mockRejectedValueOnce(
      new Error('DB Error'),
    )

    const mockRequest: MockNextRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('searchTerm=John&page=1'),
      },
    }

    const response = await GET(mockRequest as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      error: 'Failed to fetch people. Please try again later.',
    })
  })

  it('should correctly handle multiple search terms in searchTerm', async () => {
    const mockPeople = [
      { firstName: 'John', lastName: 'Doe' },
      { firstName: 'Jane', lastName: 'Smith' },
    ]
    const mockCount = 2

    // Mock Prisma's findMany and count to return mock data
    ;(prisma.person.findMany as jest.Mock).mockResolvedValueOnce(mockPeople)
    ;(prisma.person.count as jest.Mock).mockResolvedValueOnce(mockCount)

    const mockRequest: MockNextRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('searchTerm=John&page=1'),
      },
    }

    const response = await GET(mockRequest as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.people).toEqual(mockPeople)
    expect(data.total).toBe(mockCount)
    expect(data.hasMore).toBe(false)
  })
})
