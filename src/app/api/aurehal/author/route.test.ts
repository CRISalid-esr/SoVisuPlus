import { GET } from './route'
import { NextRequest } from 'next/server'

const mockFindAuthorByIdHal = jest.fn()

jest.mock('@/lib/services/AureHalAPIClient', () => ({
  AureHalAPIClient: jest.fn().mockImplementation(() => ({
    findAuthorByIdHal: mockFindAuthorByIdHal,
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

const req = (value?: string, kind?: string) =>
  ({
    nextUrl: new URL(
      `https://x/api/aurehal/author?${value !== undefined ? `value=${value}&` : ''}${kind !== undefined ? `kind=${kind}` : ''}`,
    ),
  }) as unknown as NextRequest

describe('GET /api/aurehal/author', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { authz: { userId: 'u', roleAssignments: [] } },
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

  it('502 when AureHAL errors', async () => {
    mockFindAuthorByIdHal.mockRejectedValue(new Error('down'))
    const res = await GET(req('elise-dupont', 'idhals'))
    expect(res.status).toBe(502)
  })
})
