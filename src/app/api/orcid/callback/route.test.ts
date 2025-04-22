import { NextRequest } from 'next/server'
import { GET } from './route'

const mockAddOrUpdateIdentifier = jest.fn()
const mockGetUserByPersonIdentifier = jest.fn()

jest.mock('@/lib/services/UserService', () => ({
  UserService: jest.fn().mockImplementation(() => ({
    getUserByPersonIdentifier: mockGetUserByPersonIdentifier,
  })),
}))

jest.mock('@/lib/services/PersonService', () => ({
  PersonService: jest.fn().mockImplementation(() => ({
    addOrUpdateidentifier: mockAddOrUpdateIdentifier,
  })),
}))

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    redirect: jest.fn((url: string) => ({
      headers: {
        get: (header: string) => {
          if (header === 'location') {
            return url
          }
          return null
        },
      },
    })),
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => ({
    user: {
      id: 'user-id',
      username: 'testuser',
    },
  })),
}))

global.fetch = jest.fn()

describe('GET /api/orcid/callback and add ORCID to DB', () => {
  it('should call ORCID and update person identifier on success', async () => {
    const user = {
      person: {
        uid: 'person-uid',
      },
    }

    const tokenResponse = {
      access_token: 'access-token-xyz',
      orcid: '0000-0002-1825-0097',
      name: 'ORCID User',
    }

    mockGetUserByPersonIdentifier.mockResolvedValue(user)
    ;(fetch as jest.Mock).mockResolvedValue({
      json: async () => tokenResponse,
    })

    const req: NextRequest = {
      nextUrl: new URL(
        'https://example.com/api/orcid/callback?code=abc123&lang=fr',
      ),
    } as unknown as NextRequest

    const response = await GET(req)

    const redirectUrl = response.headers.get('location')
    const expectedUrl = `${process.env.SOVISUPLUS_HOST}/fr/account?success=orcid-authentication-success`
    expect(redirectUrl).toBe(expectedUrl)

    const body = (fetch as jest.Mock).mock.calls[0][1].body
    const params = new URLSearchParams(body)

    expect(fetch).toHaveBeenCalledWith(
      'https://orcid.org/oauth/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: expect.any(URLSearchParams),
      }),
    )

    expect(params.get('client_id')).toBe('client-id')
    expect(params.get('client_secret')).toBe('secret')
    expect(params.get('code')).toBe('abc123')
    expect(params.get('grant_type')).toBe('authorization_code')
    expect(params.get('redirect_uri')).toBe(
      'https://sovisuplus.example.com/api/orcid/callback?lang=fr',
    )

    expect(mockAddOrUpdateIdentifier).toHaveBeenCalledWith(
      'person-uid',
      'orcid',
      '0000-0002-1825-0097',
    )
  })
})
