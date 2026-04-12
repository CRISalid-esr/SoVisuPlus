import { NextRequest } from 'next/server'
import { GET } from './route'
import { parseCasTicketValidationResult } from '@/utils/parseCasTicketValidationResult'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

const mockAddOrUpdateIdentifier = jest.fn()
const mockGetUserByPersonIdentifier = jest.fn()
const mockFindAuthorByUid = jest.fn()

jest.mock('@/lib/services/UserService', () => ({
  UserService: jest.fn().mockImplementation(() => ({
    getUserByPersonIdentifier: mockGetUserByPersonIdentifier,
  })),
}))

jest.mock('@/lib/services/PersonService', () => ({
  PersonService: jest.fn().mockImplementation(() => ({
    addOrUpdateIdentifier: mockAddOrUpdateIdentifier,
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

global.fetch = jest.fn()

describe('GET /api/cas/[action] stores HAL identifiers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { getServerSession } = jest.requireMock('next-auth') as {
      getServerSession: jest.Mock
    }
    getServerSession.mockResolvedValue(mockSession)
  })

  it('should use lang param in redirect URL, validate ticket, resolve idHal by uid, and store HAL_LOGIN + ID_HAL_S', async () => {
    const user = { person: mockPerson('person-uid') }

    mockGetUserByPersonIdentifier.mockResolvedValue(user)
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('<xml>ok</xml>'),
    })
    ;(parseCasTicketValidationResult as jest.Mock).mockReturnValue({
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

    const redirectUrl = response.headers.get('location')
    const expectedUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/en/account?success=hal_authentication_success`
    expect(redirectUrl).toBe(expectedUrl)

    // Ticket validation fetch called with expected URL structure
    expect(fetch).toHaveBeenCalledTimes(1)
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(decodeURIComponent(calledUrl)).toContain('/serviceValidate?service=')
    expect(decodeURIComponent(calledUrl)).toContain('/api/cas/login')
    expect(decodeURIComponent(calledUrl)).toContain('ticket=ST-abc123')

    // AureHAL called by UID
    expect(mockFindAuthorByUid).toHaveBeenCalledWith('119773')

    // Stored HAL login + idHal_s
    expect(mockAddOrUpdateIdentifier).toHaveBeenNthCalledWith(
      1,
      'person-uid',
      PersonIdentifierType.hal_login,
      'jdupont',
    )
    expect(mockAddOrUpdateIdentifier).toHaveBeenNthCalledWith(
      2,
      'person-uid',
      PersonIdentifierType.idhals,
      'jacques-dupont',
    )
  })

  it('should default to fr when lang is missing', async () => {
    const user = { person: { uid: 'person-uid' } }

    mockGetUserByPersonIdentifier.mockResolvedValue(user)
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('<xml>ok</xml>'),
    })
    ;(parseCasTicketValidationResult as jest.Mock).mockReturnValue({
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

    const redirectUrl = response.headers.get('location')
    const expectedUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/fr/account?error=hal_auth_missing_data`
    expect(redirectUrl).toBe(expectedUrl)

    expect(mockFindAuthorByUid).not.toHaveBeenCalled()
    expect(mockAddOrUpdateIdentifier).not.toHaveBeenCalled()
  })
})
