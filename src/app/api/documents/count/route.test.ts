import { NextRequest } from 'next/server'
import { GET } from './route'

jest.mock('../../../lib/services/DocumentService', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    countDocuments: jest.fn().mockResolvedValue({
      allItems: 1,
      incompleteHalRepositoryItems: 1,
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
        'http://localhost/api/endpoint?contributorType=person&searchTerm=test',
      ),
    } as unknown as NextRequest
  })

  it('should return document count', async () => {
    const response = await GET(req)

    expect(response.status).toBe(200)
    const jsonResponse = await response.json()
    expect(jsonResponse.allItems).toBe(1)
    expect(jsonResponse.incompleteHalRepositoryItems).toBe(1)
  })
})
