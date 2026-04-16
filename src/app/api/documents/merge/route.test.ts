import { POST } from './route'
import { AuthOptions, getServerSession } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { Document, DocumentType } from '@/types/Document'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { Contribution } from '@/types/Contribution'
import { Person } from '@/types/Person'
import { InternalPerson } from '@/types/InternalPerson'
import { LocRelator } from '@/types/LocRelator'

const fetchDocumentById = jest.fn()
const mergeDocuments = jest.fn()

jest.mock('@/lib/services/DocumentService', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    fetchDocumentById,
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

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

const doc1 = new Document(
  'doc1',
  DocumentType.Document,
  null,
  null,
  null,
  null,
  null,
  [],
  [],
  [],
  [
    new Contribution(
      new InternalPerson(
        'user-1234',
        'email@example.com',
        'John Doe',
        'John',
        'Doe',
      ),
      [LocRelator.AUTHOR],
    ),
  ],
)

const doc2 = new Document(
  'doc2',
  DocumentType.Document,
  null,
  null,
  null,
  null,
  null,
  [],
  [],
  [],
  [
    new Contribution(
      new InternalPerson(
        'user-1234',
        'email@example.com',
        'John Doe',
        'John',
        'Doe',
      ),
      [LocRelator.AUTHOR],
    ),
  ],
)

const doc3 = new Document(
  'doc3',
  DocumentType.Document,
  null,
  null,
  null,
  null,
  null,
  [],
  [],
  [],
  [
    new Contribution(
      new InternalPerson(
        'user-1234',
        'email@example.com',
        'John Doe',
        'John',
        'Doe',
      ),
      [LocRelator.AUTHOR],
    ),
  ],
)

const authz = makeAuthzContext({
  roleAssignments: [
    makeAssignment(
      'document_merger',
      [
        {
          action: PermissionAction.merge,
          subject: PermissionSubject.Document,
        },
      ],
      [{ entityType: 'Person', entityUid: 'user-1234' }],
    ),
  ],
})

describe('POST /api/documents/merge', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        username: 'user-1234',
        id: 'user-1234',
        authz: authz,
      },
      expires: '2025-01-01T00:00:00.000Z',
    })
    fetchDocumentById
      .mockResolvedValueOnce(doc1)
      .mockResolvedValueOnce(doc2)
      .mockResolvedValue(doc3)
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
      json: async () => ({ documentUids: ['doc1', 'doc2'] }),
    } as unknown as Request

    await POST(request)
    expect(getServerSession).toHaveBeenCalledTimes(1)
    expect(getServerSession).toHaveBeenCalledWith(authOptions)
  })

  it('returns 401 if user is not authenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)

    const request = {
      json: async () => ({ documentUids: ['doc1', 'doc2'] }),
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
      json: async () => ({ documentUids: ['doc1'] }),
    } as unknown as Request

    const res = await POST(request)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: 'At least two distinct document UIDs are required',
    })
    expect(mergeDocuments).not.toHaveBeenCalled()

    const requestEmpty = {
      json: async () => ({ documentUids: [] }),
    } as unknown as Request

    const resEmpty = await POST(requestEmpty)
    expect(resEmpty.status).toBe(400)
    expect(await resEmpty.json()).toEqual({
      error: 'At least two distinct document UIDs are required',
    })
    expect(mergeDocuments).not.toHaveBeenCalled()
  })

  it('returns 400 error if there is unfound and out of scope documents', async () => {
    const outOfScopeDoc = new Document(
      'doc4',
      DocumentType.Document,
      null,
      null,
      null,
      null,
      null,
      [],
      [],
      [],
      [
        new Contribution(
          new InternalPerson(
            'user-5678',
            'email@example.com',
            'John Doe',
            'John',
            'Doe',
          ),
          [LocRelator.AUTHOR],
        ),
      ],
    )

    fetchDocumentById.mockReset()
    fetchDocumentById
      .mockResolvedValueOnce(doc1)
      .mockResolvedValueOnce(outOfScopeDoc)
      .mockResolvedValue(null)

    const request = {
      json: async () => ({ documentUids: ['doc1', 'doc4', 'doc5', 'doc6'] }),
    } as unknown as Request

    const res = await POST(request)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error:
        'Documents with uids doc5, doc6 not found and documents with uids doc4 cannot be merged by user',
    })
    expect(mergeDocuments).not.toHaveBeenCalled()
  })

  it('returns 404 error if there is unfound documents', async () => {
    fetchDocumentById.mockReset()
    fetchDocumentById.mockResolvedValueOnce(doc1).mockResolvedValue(null)

    const request = {
      json: async () => ({ documentUids: ['doc1', 'doc5', 'doc6'] }),
    } as unknown as Request

    const res = await POST(request)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      error: 'Documents with uids doc5, doc6 not found',
    })
    expect(mergeDocuments).not.toHaveBeenCalled()
  })

  it('returns 403 error if there is out of scope documents', async () => {
    const outOfScopeDoc4 = new Document(
      'doc4',
      DocumentType.Document,
      null,
      null,
      null,
      null,
      null,
      [],
      [],
      [],
      [
        new Contribution(
          new InternalPerson(
            'user-5678',
            'email@example.com',
            'John Doe',
            'John',
            'Doe',
          ),
          [LocRelator.AUTHOR],
        ),
      ],
    )

    const outOfScopeDoc5 = new Document(
      'doc5',
      DocumentType.Document,
      null,
      null,
      null,
      null,
      null,
      [],
      [],
      [],
      [
        new Contribution(
          new InternalPerson(
            'user-5678',
            'email@example.com',
            'John Doe',
            'John',
            'Doe',
          ),
          [LocRelator.AUTHOR],
        ),
      ],
    )

    fetchDocumentById.mockReset()
    fetchDocumentById
      .mockResolvedValueOnce(doc1)
      .mockResolvedValueOnce(outOfScopeDoc4)
      .mockResolvedValue(outOfScopeDoc5)

    const request = {
      json: async () => ({ documentUids: ['doc1', 'doc4', 'doc5'] }),
    } as unknown as Request

    const res = await POST(request)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({
      error: 'Logged user cannot merge documents with uids doc4, doc5',
    })
    expect(mergeDocuments).not.toHaveBeenCalled()
  })

  it('returns the updated list from the service in the response body', async () => {
    const updated = [
      { uid: 'doc1', state: 'waiting_for_update' },
      { uid: 'doc2', state: 'waiting_for_update' },
    ]
    mergeDocuments.mockResolvedValueOnce({ updated })

    const request = {
      json: async () => ({ documentUids: ['doc1', 'doc2'] }),
    } as unknown as Request

    const res = await POST(request)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.updated).toEqual(updated)
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
