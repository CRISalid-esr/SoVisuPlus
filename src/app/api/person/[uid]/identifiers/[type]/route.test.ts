import { PUT, DELETE } from './route'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

const mockFetchPersonByUid = jest.fn()
const mockAddIdentifier = jest.fn()
const mockRemoveIdentifier = jest.fn()

jest.mock('@/lib/daos/PersonDAO', () => ({
  PersonDAO: jest.fn().mockImplementation(() => ({
    fetchPersonByUid: mockFetchPersonByUid,
  })),
  IdentifierConflictError: class extends Error {},
}))

jest.mock('@/lib/services/PersonService', () => ({
  PersonService: jest.fn().mockImplementation(() => ({
    addIdentifier: mockAddIdentifier,
    removeIdentifier: mockRemoveIdentifier,
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

const perm = {
  action: PermissionAction.update,
  subject: PermissionSubject.Person,
  fields: ['identifiers'],
}

const wideAuthz = (personUid: string) =>
  makeAuthzContext({
    personUid,
    roleAssignments: [makeAssignment('account_editor', [perm])],
  })

const selfAuthz = (personUid: string) =>
  makeAuthzContext({
    personUid,
    roleAssignments: [
      makeAssignment(
        'account_editor',
        [perm],
        [{ entityType: 'Person', entityUid: personUid }],
      ),
    ],
  })

const person = (
  uid: string,
  { has = [] as PersonIdentifierType[], authenticated = false } = {},
) => ({
  uid,
  hasIdentifier: (t: PersonIdentifierType) => has.includes(t),
  isIdentifierAuthenticated: () => authenticated,
  authzProperties: {
    __type: 'Person',
    perimeter: { Person: [uid], ResearchUnit: [] },
  },
})

const setSession = (authz: unknown) =>
  (getServerSession as jest.Mock).mockResolvedValue({ user: { authz } })

const ctx = (uid: string, type: string) => ({
  params: Promise.resolve({ uid, type }),
})

const putReq = (value: string) =>
  ({ json: async () => ({ value }) }) as unknown as Request

describe('PUT /api/person/[uid]/identifiers/[type]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAddIdentifier.mockResolvedValue(undefined)
  })

  it('adds an IdRef for a wide-scoped editor', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(person('bob'))

    const res = await PUT(putReq('026404435'), ctx('bob', 'idref'))
    expect(res.status).toBe(200)
    expect(mockAddIdentifier).toHaveBeenCalledTimes(1)
  })

  it('rejects an invalid format with 400', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(person('bob'))

    const res = await PUT(putReq('not-valid'), ctx('bob', 'idref'))
    expect(res.status).toBe(400)
    expect(mockAddIdentifier).not.toHaveBeenCalled()
  })

  it('returns 409 when an identifier of that type already exists', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(
      person('bob', { has: [PersonIdentifierType.idref] }),
    )

    const res = await PUT(putReq('026404435'), ctx('bob', 'idref'))
    expect(res.status).toBe(409)
    expect(mockAddIdentifier).not.toHaveBeenCalled()
  })

  it('returns 409 when adding idhals while idhali already exists (one HAL slot)', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(
      person('bob', { has: [PersonIdentifierType.idhali] }),
    )

    const res = await PUT(putReq('john-doe'), ctx('bob', 'idhals'))
    expect(res.status).toBe(409)
  })

  it('forbids a self-scoped editor from adding (wide scope required)', async () => {
    setSession(selfAuthz('alice'))
    mockFetchPersonByUid.mockResolvedValue(person('alice'))

    const res = await PUT(putReq('026404435'), ctx('alice', 'idref'))
    expect(res.status).toBe(403)
    expect(mockAddIdentifier).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/person/[uid]/identifiers/[type]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRemoveIdentifier.mockResolvedValue(undefined)
  })

  it('lets the owner remove an authenticated identifier', async () => {
    setSession(wideAuthz('bob'))
    mockFetchPersonByUid.mockResolvedValue(
      person('bob', { authenticated: true }),
    )

    const res = await DELETE({} as Request, ctx('bob', 'orcid'))
    expect(res.status).toBe(200)
    expect(mockRemoveIdentifier).toHaveBeenCalled()
  })

  it('forbids a wide editor from removing an authenticated identifier on another account', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(
      person('bob', { authenticated: true }),
    )

    const res = await DELETE({} as Request, ctx('bob', 'orcid'))
    expect(res.status).toBe(403)
    expect(mockRemoveIdentifier).not.toHaveBeenCalled()
  })

  it('lets a wide editor remove a non-authenticated identifier on another account', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(
      person('bob', { authenticated: false }),
    )

    const res = await DELETE({} as Request, ctx('bob', 'idref'))
    expect(res.status).toBe(200)
    expect(mockRemoveIdentifier).toHaveBeenCalled()
  })
})
