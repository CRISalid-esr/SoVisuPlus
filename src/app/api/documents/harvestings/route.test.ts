import { getServerSession } from 'next-auth'
import { ActionDAO } from '@/lib/daos/ActionDAO'
import { UserDAO } from '@/lib/daos/UserDAO'
import { POST } from './route'

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
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { username: 'jdoe' },
    })
    ;(UserDAO as jest.Mock).mockImplementation(() => ({
      getUserByIdentifier: jest.fn().mockResolvedValue({
        person: { uid: 'actor-uid' },
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
