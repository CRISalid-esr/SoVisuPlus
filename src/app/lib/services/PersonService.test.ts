import { PersonService } from '@/lib/services/PersonService'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { Person } from '@/types/Person'

jest.mock('@/lib/daos/PersonDAO') // Mock the DAO

describe('PersonService', () => {
  let personService: PersonService
  let mockFetchPeople: jest.Mock

  beforeEach(() => {
    mockFetchPeople = jest.fn()
    ;(PersonDAO as unknown as jest.Mock).mockImplementation(() => ({
      fetchPeople: mockFetchPeople,
    }))

    personService = new PersonService()
  })

  it('should return people, total, and hasMore when fetchPeople succeeds', async () => {
    const mockResponse = {
      hasMore: true,
      people: [
        new Person(
          'person-123',
          false,
          'john.doe@example.com',
          'John Doe',
          'John',
          'Doe',
          [],
        ),
      ],
      total: 1,
    }

    mockFetchPeople.mockResolvedValue(mockResponse)

    await expect(
      personService.fetchPeople('John', 1, false, 10),
    ).resolves.toEqual(mockResponse)

    expect(mockFetchPeople).toHaveBeenCalledWith('John', 1, false, 10)
  })

  it('should throw an error when fetchPeople fails', async () => {
    mockFetchPeople.mockRejectedValue(new Error('DB error'))

    await expect(
      personService.fetchPeople('John', 1, false, 10),
    ).rejects.toThrow('Error fetching people from service')

    expect(mockFetchPeople).toHaveBeenCalledWith('John', 1, false, 10)
  })
})
