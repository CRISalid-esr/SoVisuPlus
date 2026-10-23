import { PUT, DELETE, PATCH } from './route'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

const mockFetchPersonByUid = jest.fn()
const mockAddIdentifier = jest.fn()
const mockRemoveIdentifier = jest.fn()
const mockValidateIdentifier = jest.fn()

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
    validateIdentifier: mockValidateIdentifier,
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
  {
    has = [] as PersonIdentifierType[],
    authenticated = false,
    validated = false,
  } = {},
) => ({
  uid,
  hasIdentifier: (t: PersonIdentifierType) => has.includes(t),
  isIdentifierAuthenticated: () => authenticated,
  isIdentifierValidated: () => validated || authenticated,
  authzProperties: {
    __type: 'Person',
    perimeter: { Person: [uid], ResearchUnit: [] },
  },
})

const setSession = (authz: unknown) =>
  (getServerSession as jest.Mock).mockResolvedValue({
    user: { username: 'u', authz },
  })

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

  it('forbids a self-scoped editor from removing their own IdRef', async () => {
    setSession(selfAuthz('alice'))
    mockFetchPersonByUid.mockResolvedValue(person('alice'))

    const res = await DELETE({} as Request, ctx('alice', 'idref'))
    expect(res.status).toBe(403)
    expect(mockRemoveIdentifier).not.toHaveBeenCalled()
  })

  it('lets a self-scoped editor remove another non-authenticated identifier', async () => {
    setSession(selfAuthz('alice'))
    mockFetchPersonByUid.mockResolvedValue(person('alice'))

    const res = await DELETE({} as Request, ctx('alice', 'idhals'))
    expect(res.status).toBe(200)
    expect(mockRemoveIdentifier).toHaveBeenCalled()
  })
})

const patchReq = (body: unknown) =>
  ({ json: async () => body }) as unknown as Request

describe('PATCH /api/person/[uid]/identifiers/[type]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateIdentifier.mockResolvedValue(undefined)
  })

  it('lets a wide editor validate a non-validated identifier on another account', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(
      person('bob', { has: [PersonIdentifierType.idref] }),
    )

    const res = await PATCH(patchReq({ validated: true }), ctx('bob', 'idref'))
    expect(res.status).toBe(200)
    expect(mockValidateIdentifier).toHaveBeenCalledWith(
      'bob',
      PersonIdentifierType.idref,
    )
  })

  it('lets a wide editor validate an identifier on their own account', async () => {
    setSession(wideAuthz('alice'))
    mockFetchPersonByUid.mockResolvedValue(
      person('alice', { has: [PersonIdentifierType.orcid] }),
    )

    const res = await PATCH(
      patchReq({ validated: true }),
      ctx('alice', 'orcid'),
    )
    expect(res.status).toBe(200)
    expect(mockValidateIdentifier).toHaveBeenCalled()
  })

  it('forbids a self-scoped editor from validating', async () => {
    setSession(selfAuthz('alice'))
    mockFetchPersonByUid.mockResolvedValue(
      person('alice', { has: [PersonIdentifierType.idhals] }),
    )

    const res = await PATCH(
      patchReq({ validated: true }),
      ctx('alice', 'idhals'),
    )
    expect(res.status).toBe(403)
    expect(mockValidateIdentifier).not.toHaveBeenCalled()
  })

  it('returns 409 when the identifier is already validated', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(
      person('bob', { has: [PersonIdentifierType.idref], validated: true }),
    )

    const res = await PATCH(patchReq({ validated: true }), ctx('bob', 'idref'))
    expect(res.status).toBe(409)
    expect(mockValidateIdentifier).not.toHaveBeenCalled()
  })

  it('returns 409 when the identifier is authenticated', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(
      person('bob', { has: [PersonIdentifierType.orcid], authenticated: true }),
    )

    const res = await PATCH(patchReq({ validated: true }), ctx('bob', 'orcid'))
    expect(res.status).toBe(409)
  })

  it('returns 404 when the person has no identifier of that type', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(person('bob'))

    const res = await PATCH(patchReq({ validated: true }), ctx('bob', 'idref'))
    expect(res.status).toBe(404)
  })

  it('rejects any body other than { validated: true } with 400', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(
      person('bob', { has: [PersonIdentifierType.idref] }),
    )

    const res = await PATCH(patchReq({ validated: false }), ctx('bob', 'idref'))
    expect(res.status).toBe(400)
    expect(mockValidateIdentifier).not.toHaveBeenCalled()
  })
})
