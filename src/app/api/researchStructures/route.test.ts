import { NextRequest } from 'next/server'
import { GET } from './route'
import prisma from '@/lib/prisma'
import { ResearchStructure } from '@/types/ResearchStructure'

// Mock Prisma Client
jest.mock('@/lib/prisma', () => ({
  researchStructure: {
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

describe('GET /api/researchStructures', () => {
  it('should return a list of research structures', async () => {
    const mockResearchStructures = [
      { id: 1, names: { fr: 'Structure A' } },
      { id: 2, names: { fr: 'Structure B' } },
    ]
    const mockCount = 2

    // Mock Prisma's findMany and count to return mock data
    ;(prisma.researchStructure.findMany as jest.Mock).mockResolvedValueOnce(
      mockResearchStructures,
    )
    ;(prisma.researchStructure.count as jest.Mock).mockResolvedValueOnce(
      mockCount,
    )

    // Mock the Next.js request and response
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('searchTerm=structure&page=1'),
      },
      headers: {
        'accept-language': 'fr',
        get: (header: string) => {
          return header === 'accept-language' ? 'fr' : null
        },
      },
    }

    const response = await GET(mockRequest as unknown as NextRequest) // Ensure the request is typed correctly
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.researchStructures).toEqual(mockResearchStructures)
    expect(data.total).toBe(mockCount)
    expect(data.hasMore).toBe(false)
  })

  it('should return empty result when no research structures are found', async () => {
    const mockResearchStructures: ResearchStructure[] = []
    const mockCount = 0

    // Mock Prisma's findMany and count to return empty result
    ;(prisma.researchStructure.findMany as jest.Mock).mockResolvedValueOnce(
      mockResearchStructures,
    )
    ;(prisma.researchStructure.count as jest.Mock).mockResolvedValueOnce(
      mockCount,
    )

    // Mock the Next.js request and response
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('searchTerm=nonexistent&page=1'),
      },
      headers: {
        'accept-language': 'fr',
        get: (header: string) => {
          return header === 'accept-language' ? 'fr' : null
        },
      },
    }

    const response = await GET(mockRequest as unknown as NextRequest) // Ensure the request is typed correctly
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.researchStructures).toEqual(mockResearchStructures)
    expect(data.total).toBe(mockCount)
    expect(data.hasMore).toBe(false)
  })

  it('should return a 500 error on Prisma failure', async () => {
    // Mock Prisma's findMany to throw an error
    ;(prisma.researchStructure.findMany as jest.Mock).mockRejectedValueOnce(
      new Error('DB Error'),
    )

    // Mock the Next.js request and response
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('searchTerm=structure&page=1'),
      },
      headers: {
        'accept-language': 'fr',
        get: (header: string) => {
          return header === 'accept-language' ? 'fr' : null
        },
      },
    }

    const response = await GET(mockRequest as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'An error occurred' })
  })
})
