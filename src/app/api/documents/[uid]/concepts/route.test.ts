import { DELETE, POST } from './route'

const deleteConceptsFromDocument = jest.fn()
const addConceptsToDocument = jest.fn()

jest.mock('@/lib/services/DocumentService', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    deleteConceptsFromDocument: deleteConceptsFromDocument,
    addConceptsToDocument: addConceptsToDocument,
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

describe('DELETE /api/documents/[uid]/concepts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 if UID is missing', async () => {
    const request = {
      json: async () => ({ conceptUids: ['c1', 'c2'] }),
    } as Request

    const context = { params: Promise.resolve({ uid: '' }) }

    const response = await DELETE(request, context)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Document UID is required' })
  })

  it('returns 400 if conceptUids is missing or invalid', async () => {
    const request = {
      json: async () => ({ conceptUids: [] }),
    } as Request

    const context = { params: Promise.resolve({ uid: 'doc-1' }) }

    const response = await DELETE(request, context)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'conceptUids must be a non-empty array',
    })
  })

  it('calls deleteConceptsFromDocument and returns success', async () => {
    const request = {
      json: async () => ({ conceptUids: ['c1', 'c2'] }),
    } as Request

    const context = { params: Promise.resolve({ uid: 'doc-1' }) }

    const response = await DELETE(request, context)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })

    expect(deleteConceptsFromDocument).toHaveBeenCalledWith(
      'doc-1',
      ['c1', 'c2'],
      'user-1234',
    )
  })

  it('returns 500 on internal error', async () => {
    const request = {
      json: async () => {
        throw new Error('Broken JSON')
      },
    } as unknown as Request

    const context = { params: Promise.resolve({ uid: 'doc-1' }) }

    const response = await DELETE(request, context)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal Server Error' })
  })
})

describe('POST /api/documents/[uid]/concepts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 if UID is missing', async () => {
    const request = {
      json: async () => ({ conceptUids: ['c1', 'c2'] }),
    } as Request

    const context = { params: Promise.resolve({ uid: '' }) }

    const response = await POST(request, context)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Document UID is required' })
  })

  it('returns 400 if concepts are missing or invalid', async () => {
    const request = {
      json: async () => ({ concepts: [] }),
    } as Request

    const context = { params: Promise.resolve({ uid: 'doc-1' }) }

    const response = await POST(request, context)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'concepts must be a non-empty array',
    })
  })

  it('calls addConceptsToDocument and returns success', async () => {
    const request = {
      json: async () => ({
        concepts: [
          {
            uid: 'c1',
            prefLabels: [],
            altLabels: [],
            uri: null,
          },
          {
            uid: 'c2',
            prefLabels: [],
            altLabels: [],
            uri: null,
          },
        ],
      }),
    } as Request

    const context = { params: Promise.resolve({ uid: 'doc-1' }) }

    const response = await POST(request, context)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })

    expect(addConceptsToDocument).toHaveBeenCalledWith(
      'doc-1',
      [
        {
          uid: 'c1',
          prefLabels: [],
          altLabels: [],
          uri: null,
        },
        {
          uid: 'c2',
          prefLabels: [],
          altLabels: [],
          uri: null,
        },
      ],
      'user-1234',
    )
  })

  it('returns 500 on internal error', async () => {
    const request = {
      json: async () => {
        throw new Error('Broken JSON')
      },
    } as unknown as Request

    const context = { params: Promise.resolve({ uid: 'doc-1' }) }

    const response = await POST(request, context)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal Server Error' })
  })
})
