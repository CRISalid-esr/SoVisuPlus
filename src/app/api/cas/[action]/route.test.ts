import { NextRequest } from 'next/server'
import { GET } from './route'
import { parseCasTicketValidationResult } from '@/utils/parseCasTicketValidationResult'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

const mockAuthenticateHalIdentifier = jest.fn()
const mockGetUserByPersonIdentifier = jest.fn()
const mockFindAuthorByUid = jest.fn()
const mockFindIdentifierValue = jest.fn()

jest.mock('@/lib/services/UserService', () => ({
  UserService: jest.fn().mockImplementation(() => ({
    getUserByPersonIdentifier: mockGetUserByPersonIdentifier,
  })),
}))

jest.mock('@/lib/services/PersonService', () => ({
  PersonService: jest.fn().mockImplementation(() => ({
    authenticateHalIdentifier: mockAuthenticateHalIdentifier,
  })),
}))

jest.mock('@/lib/daos/PersonDAO', () => ({
  PersonDAO: jest.fn().mockImplementation(() => ({
    findIdentifierValue: mockFindIdentifierValue,
  })),
}))

jest.mock('@/lib/services/AureHalAPIClient', () => ({
  AureHalAPIClient: jest.fn().mockImplementation(() => ({
    findAuthorByUid: mockFindAuthorByUid,
  })),
}))

jest.mock('@/utils/parseCasTicketValidationResult', () => ({
  parseCasTicketValidationResult: jest.fn(),
}))

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    redirect: jest.fn((url: string) => ({
      headers: {
        get: (header: string) => {
          if (header === 'location') return url
          return null
        },
      },
    })),
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'

const authzWithPermission = makeAuthzContext({
  roleAssignments: [
    makeAssignment('account_editor', [
      {
        action: PermissionAction.update,
        subject: PermissionSubject.Person,
        fields: ['identifiers'],
      },
    ]),
  ],
})

const mockSession = {
  user: { id: 'user-id', username: 'testuser', authz: authzWithPermission },
}

const mockPerson = (uid: string) => ({
  uid,
  authzProperties: {
    __type: 'Person',
    perimeter: { Person: [uid], ResearchUnit: [] },
  },
})

const casTicket = () => ({
  success: true,
  user: 'jdupont',
  attributes: {
    uid: '119773',
    lastName: 'Dupont',
    firstName: 'Jacques',
    email: 'jacques.dupont@myuniv.edu',
    userName: 'jdupont',
  },
})

global.fetch = jest.fn()

describe('GET /api/cas/[action] stores HAL identifiers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { getServerSession } = jest.requireMock('next-auth') as {
      getServerSession: jest.Mock
    }
    getServerSession.mockResolvedValue(mockSession)
    // Default: no idHAL stored yet → add-through-authentication
    mockFindIdentifierValue.mockResolvedValue(null)
  })

  it('validates the ticket, resolves idHal, and authenticates the idHAL', async () => {
    mockGetUserByPersonIdentifier.mockResolvedValue({
      person: mockPerson('person-uid'),
    })
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('<xml>ok</xml>'),
    })
    ;(parseCasTicketValidationResult as jest.Mock).mockReturnValue(casTicket())
    mockFindAuthorByUid.mockResolvedValue({
      idHal_s: 'jacques-dupont',
      idHal_i: 1161147,
    })

    const req: NextRequest = {
      nextUrl: new URL(
        'https://example.com/api/cas/login?ticket=ST-abc123&lang=en',
      ),
    } as unknown as NextRequest
    const ctx = { params: Promise.resolve({ action: 'login' }) }

    const response = await GET(req, ctx)

    expect(response.headers.get('location')).toBe(
      `${process.env.NEXT_PUBLIC_BASE_URL}/en/account?success=hal_authentication_success`,
    )
    expect(mockFindAuthorByUid).toHaveBeenCalledWith('119773')

    // A single authentication call carrying the idHAL + hal_login
    expect(mockAuthenticateHalIdentifier).toHaveBeenCalledTimes(1)
    expect(mockAuthenticateHalIdentifier).toHaveBeenCalledWith('person-uid', {
      type: PersonIdentifierType.idhals,
      value: 'jacques-dupont',
      halLogin: 'jdupont',
    })
  })

  it('fails with a mismatch error when the stored idHAL differs', async () => {
    mockGetUserByPersonIdentifier.mockResolvedValue({
      person: mockPerson('person-uid'),
    })
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('<xml>ok</xml>'),
    })
    ;(parseCasTicketValidationResult as jest.Mock).mockReturnValue(casTicket())
    mockFindAuthorByUid.mockResolvedValue({
      idHal_s: 'jacques-dupont',
      idHal_i: 1161147,
    })
    // stored idhals differs from the resolved value
    mockFindIdentifierValue
      .mockResolvedValueOnce('someone-else') // idhals
      .mockResolvedValueOnce(null) // idhali

    const req: NextRequest = {
      nextUrl: new URL(
        'https://example.com/api/cas/login?ticket=ST-abc123&lang=en',
      ),
    } as unknown as NextRequest
    const ctx = { params: Promise.resolve({ action: 'login' }) }

    const response = await GET(req, ctx)

    expect(response.headers.get('location')).toBe(
      `${process.env.NEXT_PUBLIC_BASE_URL}/en/account?error=hal_authentication_value_mismatch`,
    )
    expect(mockAuthenticateHalIdentifier).not.toHaveBeenCalled()
  })

  it('should redirect with missing-data error if uid is missing', async () => {
    mockGetUserByPersonIdentifier.mockResolvedValue({
      person: mockPerson('person-uid'),
    })
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('<xml>ok</xml>'),
    })
    ;(parseCasTicketValidationResult as jest.Mock).mockReturnValue({
      success: true,
      user: 'jdupont',
      attributes: {
        uid: '',
        lastName: 'Dupont',
        firstName: 'Jacques',
        email: 'jacques.dupont@myuniv.edu',
        userName: 'jdupont',
      },
    })

    const req: NextRequest = {
      nextUrl: new URL('https://example.com/api/cas/login?ticket=ST-abc123'),
    } as unknown as NextRequest
    const ctx = { params: Promise.resolve({ action: 'login' }) }

    const response = await GET(req, ctx)

    expect(response.headers.get('location')).toBe(
      `${process.env.NEXT_PUBLIC_BASE_URL}/fr/account?error=hal_auth_missing_data`,
    )
    expect(mockFindAuthorByUid).not.toHaveBeenCalled()
    expect(mockAuthenticateHalIdentifier).not.toHaveBeenCalled()
  })
})
