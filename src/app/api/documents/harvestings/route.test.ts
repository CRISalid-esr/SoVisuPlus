import { getServerSession } from 'next-auth'
import { ActionDAO } from '@/lib/daos/ActionDAO'
import { UserDAO } from '@/lib/daos/UserDAO'
import { POST } from './route'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => ({
    user: {
      username: 'testuser',
      id: '123',
    },
    expires: '2025-01-01T00:00:00.000Z',
  })),
}))
jest.mock('@/lib/daos/ActionDAO')
jest.mock('@/lib/daos/UserDAO')
jest.mock('@/lib/daos/PersonDAO')
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status ?? 200,
    })),
  },
}))

describe('POST /api/documents/harvestings', () => {
  it('should return 200 when action is created', async () => {
    const authz = makeAuthzContext({
      roleAssignments: [
        makeAssignment(
          'document_fetcher',
          [
            {
              action: PermissionAction.fetch_documents,
              subject: PermissionSubject.Person,
            },
          ],
          [{ entityType: 'Person', entityUid: 'abc' }],
        ),
      ],
    })

    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { username: 'jdoe', authz },
      expires: '2025-01-01T00:00:00.000Z',
    })
    ;(UserDAO as jest.Mock).mockImplementation(() => ({
      getUserByIdentifier: jest.fn().mockResolvedValue({
        person: { uid: 'actor-uid' },
      }),
    }))
    ;(PersonDAO as unknown as jest.Mock).mockImplementation(() => ({
      fetchPersonByUid: jest.fn().mockResolvedValue({
        uid: 'abc',
        authzProperties: {
          __type: 'Person',
          perimeter: { Person: ['abc'], ResearchUnit: [] },
        },
      }),
    }))
    ;(ActionDAO as jest.Mock).mockImplementation(() => ({
      createAction: jest.fn().mockResolvedValue(undefined),
    }))

    const request = {
      json: async () => ({
        personUid: 'abc',
        platforms: ['HAL'],
      }),
    } as unknown as Request

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
  })
})
