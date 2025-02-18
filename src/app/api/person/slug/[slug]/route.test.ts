import { NextRequest } from 'next/server'
import { GET } from './route' // Adjust path if necessary

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

describe('GET /api/person/slug/[slug]', () => {
  let req: NextRequest
  let params: { slug: string }

  beforeEach(() => {
    params = { slug: 'john-doe' }
    req = {} as unknown as NextRequest
  })

  it('should return a person when found', async () => {
    const response = await GET(req, { params })

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
    const response = await GET(req, { params })

    expect(response.status).toBe(404)
    const jsonResponse = await response.json()

    expect(jsonResponse).toEqual({
      error: 'Person with slug jane-doe-1234 not found.',
    })
  })
})
