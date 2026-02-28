import { NextRequest } from 'next/server'
import { GET } from './route' // Adjust the path to the actual file

jest.mock('../../../lib/services/DocumentService', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    fetchDocumentById: jest
      .fn()
      .mockResolvedValue({ id: '123', title: 'Test Document' }),
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
  it('should return a document when given a valid UID', async () => {
    const request = {} as NextRequest
    const context = { params: Promise.resolve({ uid: '123' }) }

    const response = await GET(request, context)

    expect(response.status).toBe(200)
    const jsonResponse = await response.json()
    expect(jsonResponse).toEqual({ id: '123', title: 'Test Document' })
  })

  it('should return 400 if UID is missing', async () => {
    const request = {} as NextRequest
    const context = { params: Promise.resolve({ uid: '' }) }

    const response = await GET(request, context)

    expect(response.status).toBe(400)
    const jsonResponse = await response.json()
    expect(jsonResponse).toEqual({ error: 'Document UID is required' })
  })
})
