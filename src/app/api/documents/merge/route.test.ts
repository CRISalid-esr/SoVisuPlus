import { POST } from './route'
import { AuthOptions } from 'next-auth'
import authOptions from '@/app/auth/auth_options'

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
    mergeDocuments.mockResolvedValue({
      updated: [
        { uid: 'doc1', state: 'waiting_for_update' },
        { uid: 'doc2', state: 'waiting_for_update' },
        { uid: 'doc3', state: 'waiting_for_update' },
      ],
    })
  })

  it('calls getServerSession with authOptions', async () => {
    const request = {
      json: async () => ({ documentUids: ['x', 'y'] }),
    } as unknown as Request

    await POST(request)
    expect(getServerSessionMock).toHaveBeenCalledTimes(1)
    expect(getServerSessionMock).toHaveBeenCalledWith(authOptions)
  })

  it('returns the updated list from the service in the response body', async () => {
    const updated = [
      { uid: 'A', state: 'waiting_for_update' },
      { uid: 'B', state: 'waiting_for_update' },
    ]
    mergeDocuments.mockResolvedValueOnce({ updated })

    const request = {
      json: async () => ({ documentUids: ['A', 'B'] }),
    } as unknown as Request

    const res = await POST(request)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.updated).toEqual(updated)
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

  it('deduplicates and filters empty UIDs, calls service, and returns 200 with updated list', async () => {
    const request = {
      json: async () => ({
        documentUids: ['doc1', 'doc2', 'doc1', '', null, 'doc3'],
      }),
    } as unknown as Request

    const res = await POST(request)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toEqual({
      success: true,
      queued: true,
      updated: [
        { uid: 'doc1', state: 'waiting_for_update' },
        { uid: 'doc2', state: 'waiting_for_update' },
        { uid: 'doc3', state: 'waiting_for_update' },
      ],
    })

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
