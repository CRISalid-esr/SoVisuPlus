// requireSession reads the session through next-auth; authOptions pulls in
// openid-client, which Jest cannot parse, hence the mocks.
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { GET } from './route' // Adjust path if necessary
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { Scope } from '@/types/authz'

jest.mock('@/lib/services/PersonService', () => ({
  PersonService: jest.fn().mockImplementation(() => ({
    fetchPersonBySlug: jest.fn().mockImplementation((slug) => {
      if (slug === 'john-doe') {
        return Promise.resolve({
          uid: '12345',
          slug: 'john-doe',
          displayName: 'John Doe',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          external: false,
        })
      }
      if (slug === 'validated-person') {
        return Promise.resolve({
          uid: 'bob',
          slug: 'validated-person',
          validated: true,
          authzProperties: {
            __type: 'Person',
            perimeter: { Person: ['bob'], ResearchUnit: ['unit-1'] },
          },
        })
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

const mockGetServerSession = getServerSession as jest.Mock

const accountEditorSession = (scopes: Scope[]) => ({
  user: {
    username: 'librarian',
    authz: makeAuthzContext({
      personUid: 'librarian',
      roleAssignments: [
        makeAssignment(
          'account_editor',
          [
            {
              action: PermissionAction.update,
              subject: PermissionSubject.Person,
              fields: ['identifiers'],
            },
          ],
          scopes,
        ),
      ],
    }),
  },
})

beforeEach(() => {
  mockGetServerSession.mockResolvedValue({ user: { username: 'jdupont' } })
})

describe('GET /api/person/slug/[slug]', () => {
  let req: NextRequest
  let params: { slug: string }

  beforeEach(() => {
    params = { slug: 'john-doe' }
    req = {} as unknown as NextRequest
  })

  it('should return a person when found', async () => {
    const response = await GET(req, {
      params: Promise.resolve(params),
    })

    expect(response.status).toBe(200)
    const jsonResponse = await response.json()

    expect(jsonResponse).toEqual({
      uid: '12345',
      slug: 'john-doe',
      displayName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      external: false,
    })
  })

  it('should return 404 when person is not found', async () => {
    params = { slug: 'jane-doe-1234' } // Non-existing UID
    const response = await GET(req, {
      params: Promise.resolve(params),
    })

    expect(response.status).toBe(404)
    const jsonResponse = await response.json()

    expect(jsonResponse).toEqual({
      error: 'Person with slug jane-doe-1234 not found.',
    })
  })

  it('rejects an anonymous caller', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await GET(req, { params: Promise.resolve(params) })

    expect(response.status).toBe(401)
  })

  describe('profile validation status', () => {
    const fetchValidated = async () => {
      const response = await GET(req, {
        params: Promise.resolve({ slug: 'validated-person' }),
      })
      return (await response.json()).validated
    }

    it('is disclosed to a wide-scoped editor of the person', async () => {
      mockGetServerSession.mockResolvedValue(
        accountEditorSession([
          { entityType: 'ResearchUnit', entityUid: 'unit-1' },
        ]),
      )
      expect(await fetchValidated()).toBe(true)
    })

    it('is hidden from a wide-scoped editor outside the perimeter', async () => {
      mockGetServerSession.mockResolvedValue(
        accountEditorSession([
          { entityType: 'ResearchUnit', entityUid: 'unit-2' },
        ]),
      )
      expect(await fetchValidated()).toBe(false)
    })

    it('is hidden from a viewer without the account editor right', async () => {
      expect(await fetchValidated()).toBe(false)
    })
  })
})
