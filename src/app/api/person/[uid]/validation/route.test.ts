// Tests for the profile validation route: body checks, wide-scope gating, 409 on re-validation.
import { PATCH } from './route'

const mockFetchPersonByUid = jest.fn()
const mockValidateProfile = jest.fn()

jest.mock('@/lib/daos/PersonDAO', () => ({
  PersonDAO: jest.fn().mockImplementation(() => ({
    fetchPersonByUid: mockFetchPersonByUid,
  })),
}))

jest.mock('@/lib/services/PersonService', () => ({
  PersonService: jest.fn().mockImplementation(() => ({
    validateProfile: mockValidateProfile,
  })),
}))

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))

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

const unitAuthz = (personUid: string, unitUid: string) =>
  makeAuthzContext({
    personUid,
    roleAssignments: [
      makeAssignment(
        'account_editor',
        [perm],
        [{ entityType: 'ResearchUnit', entityUid: unitUid }],
      ),
    ],
  })

const person = (
  uid: string,
  { validated = false, units = [] as string[] } = {},
) => ({
  uid,
  validated,
  authzProperties: {
    __type: 'Person',
    perimeter: { Person: [uid], ResearchUnit: units },
  },
})

const setSession = (authz: unknown) =>
  (getServerSession as jest.Mock).mockResolvedValue({
    user: { username: 'u', authz },
  })

const ctx = (uid: string) => ({ params: Promise.resolve({ uid }) })

const req = (body: unknown) =>
  ({ json: async () => body }) as unknown as Request

describe('PATCH /api/person/[uid]/validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateProfile.mockResolvedValue(true)
  })

  it('lets a wide editor validate another profile', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(person('bob'))

    const res = await PATCH(req({ validated: true }), ctx('bob'))
    expect(res.status).toBe(200)
    // The validator is the person of the session user
    expect(mockValidateProfile).toHaveBeenCalledWith('bob', 'librarian')
  })

  it('lets a wide editor validate their own profile', async () => {
    setSession(wideAuthz('alice'))
    mockFetchPersonByUid.mockResolvedValue(person('alice'))

    const res = await PATCH(req({ validated: true }), ctx('alice'))
    expect(res.status).toBe(200)
  })

  it('lets a unit-scoped editor validate a member of the unit', async () => {
    setSession(unitAuthz('librarian', 'unit-1'))
    mockFetchPersonByUid.mockResolvedValue(person('bob', { units: ['unit-1'] }))

    const res = await PATCH(req({ validated: true }), ctx('bob'))
    expect(res.status).toBe(200)
  })

  it('forbids a unit-scoped editor outside their perimeter', async () => {
    setSession(unitAuthz('librarian', 'unit-1'))
    mockFetchPersonByUid.mockResolvedValue(person('bob', { units: ['unit-2'] }))

    const res = await PATCH(req({ validated: true }), ctx('bob'))
    expect(res.status).toBe(403)
    expect(mockValidateProfile).not.toHaveBeenCalled()
  })

  it('forbids a self-scoped editor', async () => {
    setSession(selfAuthz('alice'))
    mockFetchPersonByUid.mockResolvedValue(person('alice'))

    const res = await PATCH(req({ validated: true }), ctx('alice'))
    expect(res.status).toBe(403)
    expect(mockValidateProfile).not.toHaveBeenCalled()
  })

  it('returns 409 when the profile is already validated', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(person('bob', { validated: true }))

    const res = await PATCH(req({ validated: true }), ctx('bob'))
    expect(res.status).toBe(409)
    expect(mockValidateProfile).not.toHaveBeenCalled()
  })

  it('returns 409 when validated concurrently', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(person('bob'))
    mockValidateProfile.mockResolvedValue(false)

    const res = await PATCH(req({ validated: true }), ctx('bob'))
    expect(res.status).toBe(409)
  })

  it('returns 404 when the person does not exist', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(null)

    const res = await PATCH(req({ validated: true }), ctx('ghost'))
    expect(res.status).toBe(404)
  })

  it.each([[{}], [{ validated: false }], [{ validated: 'true' }]])(
    'rejects body %j with 400',
    async (body) => {
      setSession(wideAuthz('librarian'))
      const res = await PATCH(req(body), ctx('bob'))
      expect(res.status).toBe(400)
      expect(mockFetchPersonByUid).not.toHaveBeenCalled()
    },
  )

  it('returns 500 when the service fails', async () => {
    setSession(wideAuthz('librarian'))
    mockFetchPersonByUid.mockResolvedValue(person('bob'))
    mockValidateProfile.mockRejectedValue(new Error('db down'))
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const res = await PATCH(req({ validated: true }), ctx('bob'))
    expect(res.status).toBe(500)
  })
})
