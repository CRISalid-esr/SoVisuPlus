// requireSession reads the session through next-auth; authOptions pulls in
// openid-client, which Jest cannot parse, hence the mocks.
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET } from './route'

const mockGetStructureMembers = jest.fn()

jest.mock('@/lib/services/OrganizationUnitService', () => ({
  STRUCTURE_MEMBER_SORT_KEYS: ['name', 'position', 'startDate'],
  STRUCTURE_MEMBER_VALIDATION_FILTERS: ['all', 'not_validated'],
  OrganizationUnitService: jest.fn().mockImplementation(() => ({
    fetchVisibilityState: jest.fn().mockResolvedValue({
      hiddenEffective: false,
    }),
    getStructureMembers: mockGetStructureMembers,
  })),
}))

jest.mock('@/app/auth/structureVisibility', () => ({
  canManageStructureVisibility: jest.fn(),
}))

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status ?? 200,
    })),
  },
}))

const call = (search: string, params: Record<string, string> = {}) =>
  GET(
    {
      nextUrl: new URL(
        `http://localhost/api/organizations/ru1/members?${new URLSearchParams({ search, ...params })}`,
      ),
    } as unknown as NextRequest,
    { params: Promise.resolve({ uid: 'ru1' }) },
  )

const mockGetServerSession = getServerSession as jest.Mock

beforeEach(() => {
  mockGetServerSession.mockResolvedValue({ user: { username: 'jdupont' } })
})

describe('GET /api/organizations/[uid]/members', () => {
  beforeEach(() => {
    mockGetStructureMembers.mockReset()
    mockGetStructureMembers.mockResolvedValue({ members: [], total: 0 })
  })

  it('passes the name search to the service', async () => {
    const response = await call('durand')

    expect(response.status).toBe(200)
    expect(mockGetStructureMembers).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'ru1', search: 'durand' }),
    )
  })

  it('passes the session authorization context to the service', async () => {
    const authz = { personUid: 'p1', roleAssignments: [] }
    mockGetServerSession.mockResolvedValue({
      user: { username: 'jdupont', authz },
    })
    const members = [{ toJson: () => ({ uid: 'p2', canEditAccount: true }) }]
    mockGetStructureMembers.mockResolvedValue({ members, total: 1 })

    const response = await call('')

    expect(mockGetStructureMembers).toHaveBeenCalledWith(
      expect.objectContaining({ authz }),
    )
    expect(await response.json()).toEqual({
      members: [{ uid: 'p2', canEditAccount: true }],
      total: 1,
    })
  })

  it('parses the sort criteria in priority order, ignoring unknown and repeated keys', async () => {
    await call('', { sort: '-position,bogus,name,-name' })

    expect(mockGetStructureMembers).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          { key: 'position', desc: true },
          { key: 'name', desc: false },
        ],
      }),
    )
  })

  it('passes an empty sort when none is requested', async () => {
    await call('')

    expect(mockGetStructureMembers).toHaveBeenCalledWith(
      expect.objectContaining({ sort: [] }),
    )
  })

  it('passes the validation filter, defaulting unknown values to all', async () => {
    await call('', { validation: 'not_validated' })
    expect(mockGetStructureMembers).toHaveBeenLastCalledWith(
      expect.objectContaining({ validation: 'not_validated' }),
    )

    await call('', { validation: 'validated' })
    expect(mockGetStructureMembers).toHaveBeenLastCalledWith(
      expect.objectContaining({ validation: 'all' }),
    )
  })

  it('rejects a search longer than the name search limit', async () => {
    const response = await call('a'.repeat(201))

    expect(response.status).toBe(400)
    expect(mockGetStructureMembers).not.toHaveBeenCalled()
  })

  it('rejects an anonymous caller', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await call('durand')

    expect(response.status).toBe(401)
    expect(mockGetStructureMembers).not.toHaveBeenCalled()
  })
})
