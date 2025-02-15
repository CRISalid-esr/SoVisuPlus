import { PersonService } from '@/lib/services/PersonService'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { Person } from '@/types/Person'

jest.mock('@/lib/daos/PersonDAO') // Mock the DAO

describe('PersonService', () => {
  let personService: PersonService
  let mockFetchPeopleFromDb: jest.Mock

  beforeEach(() => {
    mockFetchPeopleFromDb = jest.fn()
    ;(PersonDAO as jest.Mock).mockImplementation(() => ({
      fetchPeopleFromDb: mockFetchPeopleFromDb,
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

    mockFetchPeopleFromDb.mockResolvedValue(mockResponse)

    const params = {
      searchTerm: 'John',
      page: 1,
      includeExternal: false,
      itemsPerPage: 10,
    }

    await expect(personService.fetchPeople(params)).resolves.toEqual(
      mockResponse,
    )

    expect(mockFetchPeopleFromDb).toHaveBeenCalledWith(params)
  })

  it('should throw an error when fetchPeopleFromDb fails', async () => {
    mockFetchPeopleFromDb.mockRejectedValue(new Error('DB error'))

    const params = {
      searchTerm: 'John',
      page: 1,
      includeExternal: false,
      itemsPerPage: 10,
    }

    await expect(personService.fetchPeople(params)).rejects.toThrow(
      'Error fetching people from service',
    )

    expect(mockFetchPeopleFromDb).toHaveBeenCalledWith(params)
  })
})
