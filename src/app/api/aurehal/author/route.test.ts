import { GET } from './route'
import { NextRequest } from 'next/server'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

const mockFindAuthorByIdHal = jest.fn()
const mockIsAnyIdentifierUsedByAnotherPerson = jest.fn()

jest.mock('@/lib/services/AureHalAPIClient', () => ({
  ...jest.requireActual('@/lib/services/AureHalAPIClient'),
  AureHalAPIClient: jest.fn().mockImplementation(() => ({
    findAuthorByIdHal: mockFindAuthorByIdHal,
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

const req = (value?: string, kind?: string, personUid?: string) =>
  ({
    nextUrl: new URL(
      `https://x/api/aurehal/author?${value !== undefined ? `value=${value}&` : ''}${kind !== undefined ? `kind=${kind}` : ''}${personUid !== undefined ? `&personUid=${personUid}` : ''}`,
    ),
  }) as unknown as NextRequest

const perm = {
  action: PermissionAction.update,
  subject: PermissionSubject.Person,
  fields: ['identifiers'],
}

const setAuthz = (authz: unknown) =>
  (getServerSession as jest.Mock).mockResolvedValue({
    user: { username: 'u', authz },
  })

const wideAuthz = makeAuthzContext({
  personUid: 'librarian',
  roleAssignments: [makeAssignment('account_editor', [perm])],
})

const selfAuthz = makeAuthzContext({
  personUid: 'alice',
  roleAssignments: [
    makeAssignment(
      'account_editor',
      [perm],
      [{ entityType: 'Person', entityUid: 'alice' }],
    ),
  ],
})

describe('GET /api/aurehal/author', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { username: 'u', authz: { userId: 'u', roleAssignments: [] } },
    })
  })

  it('401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await GET(req('elise-dupont', 'idhals'))
    expect(res.status).toBe(401)
  })

  it('400 for a bad kind', async () => {
    const res = await GET(req('elise-dupont', 'bogus'))
    expect(res.status).toBe(400)
    expect(mockFindAuthorByIdHal).not.toHaveBeenCalled()
  })

  it('400 when value is missing', async () => {
    const res = await GET(req(undefined, 'idhals'))
    expect(res.status).toBe(400)
  })

  it('returns the author doc on success', async () => {
    const doc = { fullName_s: 'Elise Dupont', idHal_s: 'elise-dupont' }
    mockFindAuthorByIdHal.mockResolvedValue(doc)
    const res = await GET(req('elise-dupont', 'idhals'))
    expect(res.status).toBe(200)
    expect(res.body).toEqual(doc)
    expect(mockFindAuthorByIdHal).toHaveBeenCalledWith('elise-dupont', 'idhals')
  })

  it('404 when no author matches', async () => {
    mockFindAuthorByIdHal.mockResolvedValue(null)
    const res = await GET(req('nobody', 'idhals'))
    expect(res.status).toBe(404)
  })

  describe('usedByAnotherPerson flag', () => {
    const doc = {
      fullName_s: 'Elise Dupont',
      idHal_s: 'elise-dupont',
      idHal_i: 4242,
    }

    beforeEach(() => {
      mockFindAuthorByIdHal.mockResolvedValue(doc)
    })

    it('checks both idHAL forms for a wide-scoped editor', async () => {
      setAuthz(wideAuthz)
      mockIsAnyIdentifierUsedByAnotherPerson.mockResolvedValue(true)

      const res = await GET(req('elise-dupont', 'idhals', 'bob'))

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ...doc, usedByAnotherPerson: true })
      expect(mockIsAnyIdentifierUsedByAnotherPerson).toHaveBeenCalledWith(
        'bob',
        [
          new PersonIdentifier(PersonIdentifierType.idhals, 'elise-dupont'),
          new PersonIdentifier(PersonIdentifierType.idhali, '4242'),
        ],
      )
    })

    it('also checks it for a self-scoped user', async () => {
      setAuthz(selfAuthz)
      mockIsAnyIdentifierUsedByAnotherPerson.mockResolvedValue(true)

      const res = await GET(req('elise-dupont', 'idhals', 'alice'))

      expect(res.body).toEqual({ ...doc, usedByAnotherPerson: true })
    })

    it('omits the flag when no personUid is given', async () => {
      setAuthz(wideAuthz)

      const res = await GET(req('elise-dupont', 'idhals'))

      expect(res.body).toEqual(doc)
      expect(mockIsAnyIdentifierUsedByAnotherPerson).not.toHaveBeenCalled()
    })
  })

  it('502 when AureHAL errors', async () => {
    mockFindAuthorByIdHal.mockRejectedValue(new Error('down'))
    const res = await GET(req('elise-dupont', 'idhals'))
    expect(res.status).toBe(502)
  })
})
