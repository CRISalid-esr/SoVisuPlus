// Tests the route giving the oldest publication year of a dashboard perspective.
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))
jest.mock('@/app/auth/structureVisibility', () => ({
  isHiddenPerspective: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { isHiddenPerspective } from '@/app/auth/structureVisibility'
import { GET } from './route'

const mockOldestPublicationYear = jest.fn()

jest.mock('@/lib/services/DocumentService', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    oldestPublicationYear: mockOldestPublicationYear,
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
const mockIsHiddenPerspective = isHiddenPerspective as jest.Mock

const request = (query: string) =>
  ({
    nextUrl: new URL(`http://localhost/api/documents/dataviz/years?${query}`),
  }) as unknown as NextRequest

beforeEach(() => {
  jest.clearAllMocks()
  mockGetServerSession.mockResolvedValue({ user: { username: 'jdupont' } })
  mockIsHiddenPerspective.mockResolvedValue(false)
})

describe('GET /api/documents/dataviz/years', () => {
  it('returns the oldest publication year of the perspective', async () => {
    mockOldestPublicationYear.mockResolvedValue(2009)

    const response = await GET(
      request('contributorUid=local-UP1&contributorType=institution'),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ oldestYear: 2009 })
    expect(mockOldestPublicationYear).toHaveBeenCalledWith(
      'local-UP1',
      'institution',
    )
  })

  it('rejects an invalid contributorType', async () => {
    const response = await GET(request('contributorUid=x&contributorType=foo'))
    expect(response.status).toBe(400)
  })

  it('rejects an anonymous caller', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const response = await GET(request('contributorType=person'))
    expect(response.status).toBe(401)
  })

  it('answers a hidden structure perspective as not found', async () => {
    mockIsHiddenPerspective.mockResolvedValue(true)
    const response = await GET(
      request('contributorUid=local-UP1&contributorType=institution'),
    )
    expect(response.status).toBe(404)
  })

  it('returns 500 when the service fails', async () => {
    mockOldestPublicationYear.mockRejectedValue(new Error('DB error'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const response = await GET(
      request('contributorUid=local-UP1&contributorType=institution'),
    )
    expect(response.status).toBe(500)
  })
})
