import { PersonDAO } from '@/lib/daos/PersonDAO'
import { Person } from '@/types/Person'
import {
  convertStringPersonIdentifierType,
  PersonIdentifier,
} from '@/types/PersonIdentifier'

export class PersonService {
  private personDAO: PersonDAO

  constructor() {
    this.personDAO = new PersonDAO()
  }

  async fetchPeople(
    searchTerm: string,
    page: number,
    includeExternal: boolean,
    itemsPerPage: number,
  ): Promise<{
    hasMore: boolean
    people: Person[]
    total: number
  }> {
    try {
      const { hasMore, people, total } = await this.personDAO.fetchPeople(
        searchTerm,
        page,
        includeExternal,
        itemsPerPage,
      )
      return { hasMore, people, total }
    } catch (error) {
      console.error('Error in service layer:', error)
      throw new Error('Error fetching people from service')
    }
  }

  async addOrUpdateidentifier(
    personUid: string,
    identifierTypeStr: string,
    identifierValue: string,
  ): Promise<void> {
    try {
      const identifier: PersonIdentifier = {
        type: convertStringPersonIdentifierType(identifierTypeStr),
        value: identifierValue,
      }
      await this.personDAO.upsertIdentifier(identifier, personUid)
    } catch (error) {
      console.error('Error adding/updating identifier:', error)
      throw new Error('Error adding/updating identifier in service')
    }
  }

  async fetchPersonBySlug(slug: string): Promise<Person | null> {
    try {
      const person = await this.personDAO.fetchPersonBySlug(slug)
      if (!person) {
        throw new Error(`Person with UID ${slug} not found`)
      }
      return person
    } catch (error) {
      console.error('Error fetching person by UID:', error)
      throw new Error('Error fetching person from service by slug')
    }
  }
}
