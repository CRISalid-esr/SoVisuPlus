import { NextRequest } from 'next/server'
import { GET } from './route'
import prisma from '@/lib/prisma'
import { Document } from '@prisma/client'

// Mock Prisma Client
jest.mock('@/lib/prisma', () => ({
  document: {
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

describe('GET /api/documents', () => {
  it('should return a list of documents', async () => {
    const mockDocuments: Document[] = [
      {
        id: 1, titles: {
          en: 'Document A',
          fr: 'Document A',
        },
        uid: ''
      },
      {
        id: 2, titles: {
          en: 'Document B',
          fr: 'Document B',
        },
        uid: ''
      },
    ]
    const mockCount = 2

    // Mock Prisma's findMany and count to return mock data
    ;(prisma.document.findMany as jest.Mock).mockResolvedValueOnce(mockDocuments)
    ;(prisma.document.count as jest.Mock).mockResolvedValueOnce(mockCount)

    // Mock the Next.js request and response
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('searchTerm=document&page=1'),
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

    expect(response.status).toBe(200)
    expect(data.documents).toEqual(mockDocuments)
    expect(data.totalItems).toBe(mockCount)
    expect(data.page).toBe(1)
    expect(data.limit).toBe(10)
  })

  it('should return empty result when no documents are found', async () => {
    const mockDocuments: Document[] = []
    const mockCount = 0

    // Mock Prisma's findMany and count to return empty result
    ;(prisma.document.findMany as jest.Mock).mockResolvedValueOnce(mockDocuments)
    ;(prisma.document.count as jest.Mock).mockResolvedValueOnce(mockCount)

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

    const response = await GET(mockRequest as unknown as NextRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.documents).toEqual(mockDocuments)
    expect(data.totalItems).toBe(mockCount)
    expect(data.page).toBe(1)
    expect(data.limit).toBe(10)
  })

  it('should return a 500 error on Prisma failure', async () => {
    // Mock Prisma's findMany to throw an error
    ;(prisma.document.findMany as jest.Mock).mockRejectedValueOnce(new Error('DB Error'))

    // Mock the Next.js request and response
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams('searchTerm=document&page=1'),
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
