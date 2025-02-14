import { NextRequest } from 'next/server'
import { GET } from './route' // Adjust path if necessary

// Mock PersonService
jest.mock('@/lib/services/PersonService', () => ({
  PersonService: jest.fn().mockImplementation(() => ({
    fetchPeople: jest.fn().mockResolvedValue({
      people: [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Smith' },
      ],
      total: 2,
      hasMore: false,
    }),
  })),
}))

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status ?? 200,
    })),
  },
}))

describe('GET /api/people', () => {
  let req: NextRequest

  beforeEach(() => {
    req = {
      nextUrl: new URL(
        'http://localhost/api/people?searchTerm=John&page=1&includeExternal=false',
      ),
    } as unknown as NextRequest
  })

  it('should return people and total count', async () => {
    const response = await GET(req)

    expect(response.status).toBe(200)
    const jsonResponse = await response.json()

    expect(jsonResponse.people).toEqual([
      { id: 1, firstName: 'John', lastName: 'Doe' },
      { id: 2, firstName: 'Jane', lastName: 'Smith' },
    ])
    expect(jsonResponse.total).toBe(2)
    expect(jsonResponse.hasMore).toBe(false)
  })
})
