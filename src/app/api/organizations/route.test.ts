// requireSession reads the session through next-auth; authOptions pulls in
// openid-client, which Jest cannot parse, hence the mocks.
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET } from './route'

jest.mock('@/lib/services/OrganizationUnitService', () => ({
  OrganizationUnitService: jest.fn().mockImplementation(() => ({
    getOrganizationUnits: jest
      .fn()
      .mockResolvedValue({ organizations: [], total: 0 }),
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

const requestWith = (params: Record<string, string>) =>
  ({
    nextUrl: new URL(
      `http://localhost/api/organizations?${new URLSearchParams(params)}`,
    ),
  }) as unknown as NextRequest

const mockGetServerSession = getServerSession as jest.Mock

beforeEach(() => {
  mockGetServerSession.mockResolvedValue({ user: { username: 'jdupont' } })
})

describe('GET /api/organizations', () => {
  it('searches a perspective group', async () => {
    const response = await GET(
      requestWith({ searchTerm: 'paris', group: 'institution' }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      organizations: [],
      total: 0,
      hasMore: false,
    })
  })

  it('rejects a search longer than the name search limit', async () => {
    const response = await GET(
      requestWith({ searchTerm: 'a'.repeat(201), group: 'institution' }),
    )

    expect(response.status).toBe(400)
  })

  it('rejects an anonymous caller', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await GET(
      requestWith({ searchTerm: 'paris', group: 'institution' }),
    )

    expect(response.status).toBe(401)
  })
})
