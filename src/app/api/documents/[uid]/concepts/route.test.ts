import { DELETE, POST } from './route'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { Document, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { Contribution } from '@/types/Contribution'
import { InternalPerson } from '@/types/InternalPerson'
import { LocRelator } from '@/types/LocRelator'
import { getServerSession } from 'next-auth'
import { OAStatus } from '@prisma/client'

const deleteConceptsFromDocument = jest.fn()
const addConceptsToDocument = jest.fn()

const document: Document = new Document(
  'doc-123',
  DocumentType.Document,
  OAStatus.GREEN,
  '2022',
  new Date('2022-01-01T00:00:00.000Z'),
  new Date('2022-12-31T23:59:59.000Z'),
  OAStatus.GREEN,
  [
    new Literal('Sample Document Title', 'en'),
    new Literal('Sample Abstract', 'fr'),
  ],
  [new Literal('Sample Abstract', 'fr')],
  [], // empty subjects
  [
    new Contribution(
      new InternalPerson('user-1234', null, 'user-1234', 'First', 'Last', []),
      [LocRelator.AUTHOR],
    ),
  ],
)

const authz = makeAuthzContext({
  roleAssignments: [
    makeAssignment(
      'document_editor',
      [
        {
          action: PermissionAction.update,
          subject: PermissionSubject.Document,
          fields: [
            'titles',
            'abstracts',
            'contributors',
            'identifiers',
            'documentType',
            'subjects',
          ],
        },
      ],
      [{ entityType: 'Person', entityUid: 'user-1234' }],
    ),
  ],
})

jest.mock('@/lib/services/DocumentService', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    fetchDocumentById: jest.fn().mockResolvedValue(document),
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
  getServerSession: jest.fn(),
}))

describe('DELETE /api/documents/[uid]/concepts', () => {
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

    const context = { params: Promise.resolve({ uid: 'doc-123' }) }

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

    const context = { params: Promise.resolve({ uid: 'doc-123' }) }

    const response = await DELETE(request, context)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })

    expect(deleteConceptsFromDocument).toHaveBeenCalledWith(
      'doc-123',
      ['c1', 'c2'],
      'user-1234',
    )
  })

  it('should return 403 error if user has no permission', async () => {
    const restrictedAuthz = makeAuthzContext({
      roleAssignments: [
        makeAssignment(
          'document_editor',
          [
            {
              action: PermissionAction.update,
              subject: PermissionSubject.Document,
              fields: [
                'titles',
                'abstracts',
                'contributors',
                'identifiers',
                'documentType',
              ],
            },
          ],
          [{ entityType: 'Person', entityUid: 'user-1234' }],
        ),
      ],
    })

    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        username: 'user-1234',
        id: 'user-1234',
        authz: restrictedAuthz,
      },
      expires: '2025-01-01T00:00:00.000Z',
    })

    const request = {
      json: async () => ({ conceptUids: ['c1', 'c2'] }),
    } as Request

    const context = { params: Promise.resolve({ uid: 'doc-123' }) }

    const response = await DELETE(request, context)
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: 'Logged user cannot update document subjects',
    })
  })

  it('returns 500 on internal error', async () => {
    const request = {
      json: async () => {
        throw new Error('Broken JSON')
      },
    } as unknown as Request

    const context = { params: Promise.resolve({ uid: 'doc-123' }) }

    const response = await DELETE(request, context)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal Server Error' })
  })
})

describe('POST /api/documents/[uid]/concepts', () => {
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

    const context = { params: Promise.resolve({ uid: 'doc-123' }) }

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

    const context = { params: Promise.resolve({ uid: 'doc-123' }) }

    const response = await POST(request, context)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })

    expect(addConceptsToDocument).toHaveBeenCalledWith(
      'doc-123',
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

  it('should return 403 error if user has no permission', async () => {
    const restrictedAuthz = makeAuthzContext({
      roleAssignments: [
        makeAssignment(
          'document_editor',
          [
            {
              action: PermissionAction.update,
              subject: PermissionSubject.Document,
              fields: [
                'titles',
                'abstracts',
                'contributors',
                'identifiers',
                'documentType',
              ],
            },
          ],
          [{ entityType: 'Person', entityUid: 'user-1234' }],
        ),
      ],
    })

    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        username: 'user-1234',
        id: 'user-1234',
        authz: restrictedAuthz,
      },
      expires: '2025-01-01T00:00:00.000Z',
    })

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

    const context = { params: Promise.resolve({ uid: 'doc-123' }) }

    const response = await POST(request, context)
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: 'Logged user cannot update document subjects',
    })
  })

  it('returns 500 on internal error', async () => {
    const request = {
      json: async () => {
        throw new Error('Broken JSON')
      },
    } as unknown as Request

    const context = { params: Promise.resolve({ uid: 'doc-123' }) }

    const response = await POST(request, context)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Internal Server Error' })
  })
})
