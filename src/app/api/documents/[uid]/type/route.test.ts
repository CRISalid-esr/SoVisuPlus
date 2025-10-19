import { PUT } from './route'
import { DocumentType } from '@prisma/client'

const updateDocumentType = jest.fn()

jest.mock('@/lib/services/DocumentService', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    updateDocumentType,
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

jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: { username: 'user-1234' },
  }),
}))

describe('PUT /api/documents/[uid]/type', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 if UID is missing', async () => {
    const request = {
      json: async () => ({ documentType: DocumentType.Book }),
    } as unknown as Request

    const context = { params: Promise.resolve({ uid: '' }) }

    const response = await PUT(request, context)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Document UID is required' })
  })

  it('returns 401 if user is not authenticated', async () => {
    const { getServerSession } = jest.requireMock('next-auth')
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

    const request = {
      json: async () => ({ documentType: DocumentType.Book }),
    } as unknown as Request

    const context = { params: Promise.resolve({ uid: 'doc-1' }) }

    const response = await PUT(request, context)
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: 'User is not authenticated',
    })
  })

  it('returns 400 if documentType is missing or invalid (null body)', async () => {
    const request = {
      json: async () => null, // route treats this as invalid type
    } as unknown as Request

    const context = { params: Promise.resolve({ uid: 'doc-1' }) }

    const response = await PUT(request, context)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Invalid or missing documentType',
    })
  })

  it('returns 400 if documentType is invalid (unknown value)', async () => {
    const request = {
      json: async () => ({ documentType: 'NotAType' }),
    } as unknown as Request

    const context = { params: Promise.resolve({ uid: 'doc-1' }) }

    const response = await PUT(request, context)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Invalid or missing documentType',
    })
  })

  it('calls updateDocumentType and returns success on valid input', async () => {
    const request = {
      json: async () => ({ documentType: DocumentType.Book }),
    } as unknown as Request

    const context = { params: Promise.resolve({ uid: 'doc-1' }) }

    const response = await PUT(request, context)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })

    expect(updateDocumentType).toHaveBeenCalledWith(
      'doc-1',
      DocumentType.Book,
      'user-1234',
    )
  })

  it('returns 500 when service throws', async () => {
    updateDocumentType.mockRejectedValueOnce(new Error('Service failure'))

    const request = {
      json: async () => ({ documentType: DocumentType.Book }),
    } as unknown as Request

    const context = { params: Promise.resolve({ uid: 'doc-1' }) }

    const response = await PUT(request, context)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal Server Error' })
  })
})
