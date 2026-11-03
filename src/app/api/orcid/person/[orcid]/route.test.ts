import { GET } from './route'
import { NextRequest } from 'next/server'

const mockFetchPerson = jest.fn()
const mockIsAnyIdentifierUsedByAnotherPerson = jest.fn()

jest.mock('@/lib/services/OrcidPublicClient', () => ({
  OrcidPublicClient: jest.fn().mockImplementation(() => ({
    fetchPerson: mockFetchPerson,
  })),
}))

jest.mock('@/lib/services/PersonService', () => ({
  PersonService: jest.fn().mockImplementation(() => ({
    isAnyIdentifierUsedByAnotherPerson: mockIsAnyIdentifierUsedByAnotherPerson,
  })),
}))

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    })),
  },
}))

import { getServerSession } from 'next-auth'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

const ctx = (orcid: string) => ({ params: Promise.resolve({ orcid }) })
const reqFor = (personUid?: string) =>
  ({
    nextUrl: new URL(
      `https://x/api/orcid/person/x${personUid ? `?personUid=${personUid}` : ''}`,
    ),
  }) as unknown as NextRequest
const req = reqFor()

const perm = {
  action: PermissionAction.update,
  subject: PermissionSubject.Person,
  fields: ['identifiers'],
}

const setAuthz = (authz: unknown) =>
  (getServerSession as jest.Mock).mockResolvedValue({
    user: { username: 'u', authz },
  })

describe('GET /api/orcid/person/[orcid]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { username: 'u', authz: { userId: 'u', roleAssignments: [] } },
    })
  })

  it('401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await GET(req, ctx('0000-0002-1825-0097'))
    expect(res.status).toBe(401)
  })

  it('400 for an invalid ORCID format', async () => {
    const res = await GET(req, ctx('bogus'))
    expect(res.status).toBe(400)
    expect(mockFetchPerson).not.toHaveBeenCalled()
  })

  it('returns the profile on success (normalizing a URL form)', async () => {
    const data = {
      givenNames: 'Josiah',
      familyName: 'Carberry',
      otherNames: [],
      affiliations: [],
    }
    mockFetchPerson.mockResolvedValue(data)
    const res = await GET(req, ctx('https://orcid.org/0000-0002-1825-0097'))
    expect(res.status).toBe(200)
    expect(res.body).toEqual(data)
    expect(mockFetchPerson).toHaveBeenCalledWith('0000-0002-1825-0097')
  })

  it('404 when the ORCID does not resolve', async () => {
    mockFetchPerson.mockResolvedValue(null)
    const res = await GET(req, ctx('0000-0002-1825-0000'))
    expect(res.status).toBe(404)
  })

  describe('usedByAnotherPerson flag', () => {
    const data = {
      givenNames: 'Josiah',
      familyName: 'Carberry',
      otherNames: [],
      affiliations: [],
    }

    beforeEach(() => {
      mockFetchPerson.mockResolvedValue(data)
    })

    it('checks the normalized ORCID for a wide-scoped editor', async () => {
      setAuthz(
        makeAuthzContext({
          personUid: 'librarian',
          roleAssignments: [makeAssignment('account_editor', [perm])],
        }),
      )
      mockIsAnyIdentifierUsedByAnotherPerson.mockResolvedValue(true)

      const res = await GET(reqFor('bob'), ctx('0000-0002-1825-009x'))

      expect(res.body).toEqual({ ...data, usedByAnotherPerson: true })
      expect(mockIsAnyIdentifierUsedByAnotherPerson).toHaveBeenCalledWith(
        'bob',
        [
          new PersonIdentifier(
            PersonIdentifierType.orcid,
            '0000-0002-1825-009X',
          ),
        ],
      )
    })

    it('also checks it for a self-scoped user', async () => {
      setAuthz(
        makeAuthzContext({
          personUid: 'alice',
          roleAssignments: [
            makeAssignment(
              'account_editor',
              [perm],
              [{ entityType: 'Person', entityUid: 'alice' }],
            ),
          ],
        }),
      )

      mockIsAnyIdentifierUsedByAnotherPerson.mockResolvedValue(true)

      const res = await GET(reqFor('alice'), ctx('0000-0002-1825-0097'))

      expect(res.body).toEqual({ ...data, usedByAnotherPerson: true })
    })
  })

  it('502 when the ORCID service errors', async () => {
    mockFetchPerson.mockRejectedValue(new Error('down'))
    const res = await GET(req, ctx('0000-0002-1825-0097'))
    expect(res.status).toBe(502)
  })
})
