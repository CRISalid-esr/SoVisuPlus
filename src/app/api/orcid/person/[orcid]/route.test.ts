import { GET } from './route'
import { NextRequest } from 'next/server'

const mockFetchPerson = jest.fn()

jest.mock('@/lib/services/OrcidPublicClient', () => ({
  OrcidPublicClient: jest.fn().mockImplementation(() => ({
    fetchPerson: mockFetchPerson,
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

const ctx = (orcid: string) => ({ params: Promise.resolve({ orcid }) })
const req = {} as unknown as NextRequest

describe('GET /api/orcid/person/[orcid]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { authz: { userId: 'u', roleAssignments: [] } },
    })
  })

  it('401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await GET(req, ctx('0000-0002-1825-0097'))
    expect(res.status).toBe(401)
  })

  it('400 for an invalid ORCID format', async () => {
    const res = await GET(req, ctx('bogus'))
    expect(res.status).toBe(400)
    expect(mockFetchPerson).not.toHaveBeenCalled()
  })

  it('returns the profile on success (normalizing a URL form)', async () => {
    const data = {
      givenNames: 'Josiah',
      familyName: 'Carberry',
      otherNames: [],
      affiliations: [],
    }
    mockFetchPerson.mockResolvedValue(data)
    const res = await GET(req, ctx('https://orcid.org/0000-0002-1825-0097'))
    expect(res.status).toBe(200)
    expect(res.body).toEqual(data)
    expect(mockFetchPerson).toHaveBeenCalledWith('0000-0002-1825-0097')
  })

  it('404 when the ORCID does not resolve', async () => {
    mockFetchPerson.mockResolvedValue(null)
    const res = await GET(req, ctx('0000-0002-1825-0000'))
    expect(res.status).toBe(404)
  })

  it('502 when the ORCID service errors', async () => {
    mockFetchPerson.mockRejectedValue(new Error('down'))
    const res = await GET(req, ctx('0000-0002-1825-0097'))
    expect(res.status).toBe(502)
  })
})
