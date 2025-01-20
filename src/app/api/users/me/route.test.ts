import prisma from '@/lib/prisma'
import { User } from '@/types/User'
import { getServerSession } from 'next-auth' // Import getServerSession
import { GET } from './route' // Adjust the import for your route handler

// Mock Prisma Client
jest.mock('@/lib/prisma', () => ({
  user: {
    findFirst: jest.fn(),
  },
}))

// Mock NextResponse
jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: jest.fn((data, init) => ({
        json: async () => data,
        status: init?.status ?? 200,
      })),
    },
  }
})

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => ({
    user: {
      id: '123-456-789',
      username: 'Test User',
      email: 'testuser@example.com',
      person: {
        uid: '123',
        external: false,
        email: 'test@frst.com',
        displayName: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        identifiers: [
          {
            type: 'local',
            value: 'Test User',
          },
        ],
      },
    },
    expires: '2025-01-01T00:00:00.000Z',
  })),
}))

describe('GET /api/route', () => {
  it('should return the connected user', async () => {
    const mockUser: User = User.fromDbUser({
      id: 123,
      person: {
        uid: '123',
        external: false,
        email: 'test',
        firstName: 'Test',
        lastName: 'User',
        id: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      personId: null,
    })

    ;(prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(mockUser)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockUser)
  })

  it('should return 401 if the user is not authenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'User not authenticated' })
  })

  it('should return 404 if user is not found in the database', async () => {
    // Mock Prisma to return null (user not found)
    ;(prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'User not found' })
  })

  it('should return 500 if Prisma throws an error', async () => {
    // Mock Prisma to throw an error
    ;(prisma.user.findFirst as jest.Mock).mockRejectedValueOnce(
      new Error('DB Error'),
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'An error occurred' })
  })
})
