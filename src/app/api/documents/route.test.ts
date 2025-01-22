import { GET } from './route'
import prisma from '@/lib/prisma'

// Mock Prisma Client
jest.mock('@/lib/prisma', () => ({
  document: {
    findMany: jest.fn(),
  },
}))

// Mock NextResponse
jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: jest.fn((data, init) => ({
        json: async () => data,
        status: init?.status ?? 200,
      })),
    },
  }
})

describe('GET /api/document', () => {
  it('should return a list of documents', async () => {
    const mockDocuments = [
      { id: 1, title: 'Document 1', content: 'Content 1' },
      { id: 2, title: 'Document 2', content: 'Content 2' },
    ]

    // Mock Prisma's findMany to return mock data
    ;(prisma.document.findMany as jest.Mock).mockResolvedValueOnce(
      mockDocuments,
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockDocuments)
  })

  it('should return a 500 error on Prisma failure', async () => {
    // Mock Prisma's findMany to throw an error
    ;(prisma.document.findMany as jest.Mock).mockRejectedValueOnce(
      new Error('DB Error'),
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'An error occurred' })
  })
})
