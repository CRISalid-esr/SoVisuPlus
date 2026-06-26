import { POST } from './route'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { Document, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { Contribution } from '@/types/Contribution'
import { InternalPerson } from '@/types/InternalPerson'
import { LocRelator } from '@/types/LocRelator'
import { getServerSession } from 'next-auth'
import { OAStatus } from '@prisma/client'

const saveContributions = jest.fn().mockResolvedValue(undefined)

const document: Document = new Document(
  'doc-123',
  DocumentType.Document,
  OAStatus.GREEN,
  '2022',
  new Date('2022-01-01T00:00:00.000Z'),
  new Date('2022-12-31T23:59:59.000Z'),
  OAStatus.GREEN,
  [new Literal('Sample Document Title', 'en')],
  [],
  [],
  [
    new Contribution(
      new InternalPerson('user-1234', null, 'user-1234', 'First', 'Last', []),
      [LocRelator.AUTHOR],
    ),
  ],
)

// document_editor scoped to the acting user's own Person, with the `contributors`
// field — so the update-contributors ability passes for this document.
const authz = makeAuthzContext({
  personUid: 'user-1234',
  roleAssignments: [
    makeAssignment(
      'document_editor',
      [
        {
          action: PermissionAction.update,
          subject: PermissionSubject.Document,
          fields: ['contributors'],
        },
      ],
      [{ entityType: 'Person', entityUid: 'user-1234' }],
    ),
  ],
})

jest.mock('@/lib/services/DocumentService', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    fetchDocumentById: jest.fn().mockResolvedValue(document),
    saveContributions,
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

const post = (contributions: unknown) =>
  POST({ json: async () => ({ contributions }) } as Request, {
    params: Promise.resolve({ uid: 'doc-123' }),
  })

// Minimal full-state entry for the baseline contributor (user-1234).
const ownContribution = {
  person: {
    uid: 'user-1234',
    displayName: 'First Last',
    firstName: 'First',
    lastName: 'Last',
    identifiers: [],
  },
  roles: ['http://id.loc.gov/vocabulary/relators/aut'],
  rank: null,
  affiliations: [],
}

describe('POST /api/documents/[uid]/contributions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { username: 'user-1234', id: 'user-1234', authz },
      expires: '2025-01-01T00:00:00.000Z',
    })
  })

  it('rejects dropping the acting user own contribution with 403', async () => {
    // The baseline document lists user-1234 as a contributor; omitting them from
    // the full-state payload would remove their own contribution.
    const response = await post([])

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: 'A user cannot delete its own contribution',
    })
    expect(saveContributions).not.toHaveBeenCalled()
  })

  it('allows removing another contributor while keeping own and saves the state', async () => {
    // Keeps user-1234 (own) but drops any other contributor by omitting them.
    const contributions = [ownContribution]
    const response = await post(contributions)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(saveContributions).toHaveBeenCalledWith(
      'doc-123',
      contributions,
      'user-1234',
    )
  })

  it('returns 401 when not authenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)

    const response = await post([ownContribution])

    expect(response.status).toBe(401)
    expect(saveContributions).not.toHaveBeenCalled()
  })
})
