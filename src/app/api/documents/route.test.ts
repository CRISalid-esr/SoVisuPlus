import { NextRequest } from 'next/server'
import { GET } from './route'

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

  const requestWith = (params: Record<string, string>) =>
    ({
      nextUrl: new URL(
        `http://localhost/api/endpoint?${new URLSearchParams({
          contributorType: 'person',
          ...params,
        })}`,
      ),
    }) as unknown as NextRequest

  it('rejects a search term longer than the documents search limit', async () => {
    const response = await GET(requestWith({ searchTerm: 'a'.repeat(501) }))

    expect(response.status).toBe(400)
  })

  it('rejects a title filter longer than the documents search limit', async () => {
    const response = await GET(
      requestWith({
        columnFilters: JSON.stringify([
          { id: 'titles', value: 'a'.repeat(501) },
        ]),
      }),
    )

    expect(response.status).toBe(400)
  })

  it('rejects a contributors filter longer than the name search limit', async () => {
    const response = await GET(
      requestWith({
        columnFilters: JSON.stringify([
          { id: 'contributions', value: 'a'.repeat(201) },
        ]),
      }),
    )

    expect(response.status).toBe(400)
  })

  it('accepts a pasted title up to the limit', async () => {
    const response = await GET(
      requestWith({
        searchTerm: 'a'.repeat(500),
        columnFilters: JSON.stringify([
          { id: 'type', value: ['Book'] },
          { id: 'titles', value: 'b'.repeat(500) },
        ]),
      }),
    )

    expect(response.status).toBe(200)
  })
})
