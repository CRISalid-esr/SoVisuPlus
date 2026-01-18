import { PersonDAO } from '@/lib/daos/PersonDAO'
import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { ActionDAO } from '@/lib/daos/ActionDAO'
import { ActionTargetType, ActionType } from '@/types/Action'
import { PersonIdentifierType as DbPersonIdentifierType } from '@prisma/client'

export class PersonService {
  private personDAO: PersonDAO
  private actionDAO: ActionDAO

  constructor() {
    this.personDAO = new PersonDAO()
    this.actionDAO = new ActionDAO()
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

  async addOrUpdateOrcidIdentifier(
    personUid: string, //uid of the person to update,
    // necessarily the same as the user performing the action
    identifierValue: string,
  ): Promise<void> {
    try {
      const identifier = new PersonIdentifier(
        DbPersonIdentifierType.ORCID,
        identifierValue,
      )
      await this.personDAO.upsertIdentifier(identifier, personUid)
      await this.actionDAO.createAction({
        actionType: ActionType.ADD,
        targetType: ActionTargetType.PERSON,
        targetUid: personUid,
        path: 'identifiers',
        parameters: { identifier: identifier.toJson() },
        personUid: personUid,
      })
    } catch (error) {
      const message = `Error adding/updating identifier (type=${DbPersonIdentifierType.ORCID}, value=${identifierValue}, personUid=${personUid}) in service`
      console.error(message, error)
      throw new Error(message)
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
