import { NextRequest } from 'next/server'
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
})
