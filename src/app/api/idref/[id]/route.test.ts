import { GET } from './route'
import { NextRequest } from 'next/server'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

const mockFetchPerson = jest.fn()
const mockIsAnyIdentifierUsedByAnotherPerson = jest.fn()

jest.mock('@/lib/services/IdRefService', () => ({
  IdRefService: jest.fn().mockImplementation(() => ({
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

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const reqFor = (personUid?: string) =>
  ({
    nextUrl: new URL(
      `https://x/api/idref/x${personUid ? `?personUid=${personUid}` : ''}`,
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

const data = { firstName: 'Marie', lastName: 'Dupont' }

describe('GET /api/idref/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setAuthz(wideAuthz)
    mockFetchPerson.mockResolvedValue(data)
  })

  it('401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await GET(reqFor(), ctx('127220747'))
    expect(res.status).toBe(401)
  })

  it('404 when the IdRef does not resolve', async () => {
    mockFetchPerson.mockRejectedValue(
      Object.assign(new Error('not found'), { status: 404 }),
    )
    const res = await GET(reqFor(), ctx('127220747'))
    expect(res.status).toBe(404)
  })

  it('502 when the IdRef service errors', async () => {
    mockFetchPerson.mockRejectedValue(new Error('down'))
    const res = await GET(reqFor(), ctx('127220747'))
    expect(res.status).toBe(502)
  })

  it('returns the record without the flag when no personUid is given', async () => {
    const res = await GET(reqFor(), ctx('127220747'))
    expect(res.body).toEqual(data)
    expect(mockIsAnyIdentifierUsedByAnotherPerson).not.toHaveBeenCalled()
  })

  it('checks the uppercased IdRef for a wide-scoped editor', async () => {
    mockIsAnyIdentifierUsedByAnotherPerson.mockResolvedValue(true)

    const res = await GET(reqFor('bob'), ctx('02640443x'))

    expect(res.body).toEqual({ ...data, usedByAnotherPerson: true })
    expect(mockIsAnyIdentifierUsedByAnotherPerson).toHaveBeenCalledWith('bob', [
      new PersonIdentifier(PersonIdentifierType.idref, '02640443X'),
    ])
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

    const res = await GET(reqFor('alice'), ctx('127220747'))

    expect(res.body).toEqual({ ...data, usedByAnotherPerson: true })
  })
})
