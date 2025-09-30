import { POST } from './route'
import { AuthOptions } from 'next-auth'

const mergeDocuments = jest.fn()

jest.mock('@/lib/services/DocumentService', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    mergeDocuments,
  })),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status ?? 200,
    })),
  },
}))

const getServerSessionMock = jest.fn()
jest.mock('next-auth', () => ({
  getServerSession: (args: AuthOptions) => getServerSessionMock(args),
}))

describe('POST /api/documents/merge', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { username: 'user-1234' } })
  })

  it('returns 401 if user is not authenticated', async () => {
    getServerSessionMock.mockResolvedValue(null)

    const request = {
      json: async () => ({ documentUids: ['a', 'b'] }),
    } as unknown as Request

    const res = await POST(request)
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'User is not authenticated' })
    expect(mergeDocuments).not.toHaveBeenCalled()
  })

  it('returns 400 if documentUids is not an array', async () => {
    const request = {
      json: async () => ({ documentUids: 'not-an-array' }),
    } as unknown as Request

    const res = await POST(request)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: 'documentUids must be an array',
    })
    expect(mergeDocuments).not.toHaveBeenCalled()
  })

  it('returns 400 if fewer than two distinct UIDs are provided', async () => {
    const request = {
      json: async () => ({ documentUids: ['only-one'] }),
    } as unknown as Request

    const res = await POST(request)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: 'At least two distinct document UIDs are required',
    })
    expect(mergeDocuments).not.toHaveBeenCalled()
  })

  it('deduplicates and filters empty UIDs, calls service, and returns 202', async () => {
    const request = {
      json: async () => ({
        documentUids: ['doc1', 'doc2', 'doc1', '', null, 'doc3'],
      }),
    } as unknown as Request

    const res = await POST(request)
    expect(res.status).toBe(202)
    expect(await res.json()).toEqual({ success: true, queued: true })

    // Should have called once with deduplicated, non-empty UIDs
    expect(mergeDocuments).toHaveBeenCalledTimes(1)
    expect(mergeDocuments).toHaveBeenCalledWith(
      ['doc1', 'doc2', 'doc3'],
      'user-1234',
    )
  })

  it('returns 500 on internal error (e.g., service throws)', async () => {
    mergeDocuments.mockRejectedValueOnce(new Error('merge failed'))

    const request = {
      json: async () => ({ documentUids: ['doc1', 'doc2'] }),
    } as unknown as Request

    const res = await POST(request)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal Server Error' })
  })

  it('returns 500 when request body JSON parsing fails', async () => {
    const request = {
      json: async () => {
        throw new Error('invalid json')
      },
    } as unknown as Request

    const res = await POST(request)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal Server Error' })
    expect(mergeDocuments).not.toHaveBeenCalled()
  })
})
