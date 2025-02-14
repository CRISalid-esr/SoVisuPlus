import { PersonDAO } from '@/lib/daos/PersonDAO'
import { Person } from '@/types/Person'

interface FetchPeopleParams {
  searchTerm: string
  page: number
  includeExternal: boolean
  itemsPerPage: number
}

export class PersonService {
  private personDAO: PersonDAO

  constructor() {
    this.personDAO = new PersonDAO() // Instantiate the DAO class
  }

  async fetchPeople({
    searchTerm,
    page,
    includeExternal,
    itemsPerPage,
  }: FetchPeopleParams): Promise<{
    hasMore: boolean
    people: Person[]
    total: number
  }> {
    try {
      const { hasMore, people, total } = await this.personDAO.fetchPeopleFromDb(
        {
          searchTerm,
          page,
          includeExternal,
          itemsPerPage,
        },
      )
      return { hasMore, people, total }
    } catch (error) {
      console.error('Error in service layer:', error)
      throw new Error('Error fetching people from service')
    }
  }
}
