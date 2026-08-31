// The route reaches for the session only to decide whether a hidden
// structure is visible; authOptions pulls in openid-client, which Jest cannot
// parse, hence the mocks.
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))
jest.mock('@/app/auth/ability', () => ({ hasUnscopedPermission: jest.fn() }))

import { NextRequest } from 'next/server'
import { hasUnscopedPermission } from '@/app/auth/ability'
import { GET } from './route'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { Literal } from '@/types/Literal'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'

const buildOrganizationUnit = (hiddenEffective = false) =>
  new OrganizationUnit(
    '12345',
    'ABCD',
    [
      new Literal('ABCD Research Unit', 'en'),
      new Literal('Unité de recherche ABCD', 'fr'),
    ],
    [],
    OrganizationCategory.research_unit,
    OrganizationGenericType.unit,
    'UMR',
    [],
    'org:abcd',
    false,
    [],
    hiddenEffective,
    hiddenEffective,
  )

jest.mock('@/lib/services/OrganizationUnitService', () => ({
  OrganizationUnitService: jest.fn().mockImplementation(() => ({
    fetchOrganizationUnitBySlug: jest.fn().mockImplementation((slug) => {
      if (slug === 'org:abcd') {
        return Promise.resolve(buildOrganizationUnit())
      }
      if (slug === 'org:hidden') {
        return Promise.resolve(buildOrganizationUnit(true))
      }
      return Promise.resolve(null)
    }),
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

const mockHasUnscopedPermission = hasUnscopedPermission as jest.Mock

describe('GET /api/organizations/slug/[slug]', () => {
  let req: NextRequest
  let params: { slug: string }

  beforeEach(() => {
    jest.clearAllMocks()
    params = { slug: 'org:abcd' }
    req = {} as unknown as NextRequest
  })

  it('should return an organization unit when found', async () => {
    const response = await GET(req, {
      params: Promise.resolve(params),
    })

    expect(response.status).toBe(200)
    const jsonResponse = await response.json()

    expect(jsonResponse).toEqual(buildOrganizationUnit())
  })

  it('should return 404 for a hidden structure when the user cannot manage them', async () => {
    mockHasUnscopedPermission.mockReturnValue(false)
    const response = await GET(req, {
      params: Promise.resolve({ slug: 'org:hidden' }),
    })

    expect(response.status).toBe(404)
  })

  it('should return a hidden structure to a structure manager', async () => {
    mockHasUnscopedPermission.mockReturnValue(true)
    const response = await GET(req, {
      params: Promise.resolve({ slug: 'org:hidden' }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(buildOrganizationUnit(true))
  })

  it('should return 404 when organization unit is not found', async () => {
    params = { slug: 'org:efgh' }
    const response = await GET(req, {
      params: Promise.resolve(params),
    })

    expect(response.status).toBe(404)
    const jsonResponse = await response.json()

    expect(jsonResponse).toEqual({
      error: 'OrganizationUnit with slug org:efgh not found',
    })
  })
})
