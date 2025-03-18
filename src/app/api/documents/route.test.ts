import { NextRequest } from 'next/server'
import { GET } from './route' // Adjust the path to the actual file

// Mocking the DocumentService class
jest.mock('../../lib/services/DocumentService', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    fetchDocuments: jest.fn().mockResolvedValue({
      documents: [{ id: 1, title: 'Test Document' }],
      totalItems: 1,
    }),
  })),
}))

jest.mock('next/server', () => {
  return {
    NextRequest: jest.fn(),
    NextResponse: {
      json: jest.fn((data, init) => {
        return {
          json: async () => data,
          status: init?.status ?? 200,
        }
      }),
    },
  }
})

describe('GET handler', () => {
  let req: NextRequest

  beforeEach(() => {
    req = {
      nextUrl: new URL(
        'http://localhost/api/endpoint?contributorType=person&searchTerm=test&page=1&pageSize=10',
      ),
    } as unknown as NextRequest
  })

  it('should return documents and totalItems', async () => {
    const response = await GET(req)

    expect(response.status).toBe(200)
    const jsonResponse = await response.json()
    expect(jsonResponse.documents).toEqual([{ id: 1, title: 'Test Document' }])
    expect(jsonResponse.totalItems).toBe(1)
    expect(jsonResponse.page).toBe(1)
    expect(jsonResponse.limit).toBe(10)
  })
})
