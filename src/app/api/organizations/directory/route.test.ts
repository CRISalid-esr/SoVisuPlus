// requireSession reads the session through next-auth; authOptions pulls in
// openid-client, which Jest cannot parse, hence the mocks.
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))
jest.mock('@/app/auth/ability', () => ({ hasUnscopedPermission: jest.fn() }))

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { hasUnscopedPermission } from '@/app/auth/ability'
import { GET } from './route'

const mockGetDirectory = jest.fn()

jest.mock('@/lib/services/OrganizationUnitService', () => ({
  OrganizationUnitService: jest.fn().mockImplementation(() => ({
    getDirectory: (...args: unknown[]) => mockGetDirectory(...args),
  })),
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

const mockGetServerSession = getServerSession as jest.Mock
const mockHasUnscopedPermission = hasUnscopedPermission as jest.Mock

const requestWith = (query = '') =>
  ({
    nextUrl: new URL(`http://localhost/api/organizations/directory${query}`),
  }) as unknown as NextRequest

describe('GET /api/organizations/directory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue({ user: { username: 'jdupont' } })
    mockGetDirectory.mockResolvedValue([])
  })

  it('returns the visible directory', async () => {
    const response = await GET(requestWith())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ structures: [] })
    expect(mockGetDirectory).toHaveBeenCalledWith({ includeHidden: false })
  })

  it('includes hidden structures for a structure manager', async () => {
    mockHasUnscopedPermission.mockReturnValue(true)

    await GET(requestWith('?includeHidden=true'))

    expect(mockGetDirectory).toHaveBeenCalledWith({ includeHidden: true })
  })

  it('ignores includeHidden for a caller without the permission', async () => {
    mockHasUnscopedPermission.mockReturnValue(false)

    await GET(requestWith('?includeHidden=true'))

    expect(mockGetDirectory).toHaveBeenCalledWith({ includeHidden: false })
  })

  it('rejects an anonymous caller', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await GET(requestWith())

    expect(response.status).toBe(401)
    expect(mockGetDirectory).not.toHaveBeenCalled()
  })
})
