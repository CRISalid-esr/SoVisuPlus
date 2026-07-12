import { IdentifierConflictError, PersonDAO } from '@/lib/daos/PersonDAO'
import { Person } from '@/types/Person'
import {
  IdentifierMessagePayload,
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { ActionDAO } from '@/lib/daos/ActionDAO'
import { ActionTargetType, ActionType } from '@/types/Action'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'
import { InputJsonValue } from '@prisma/client/runtime/library'

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

  /**
   * Records a person-identifier change as an outgoing action. The
   * `authenticated` flag is derived from the operation (manual add → false,
   * authentication → true) and stamped into the message payload — it is never
   * persisted. See specs/872-refactor-account-edition-workflow/prompt.md.
   */
  private async recordIdentifierAction(
    personUid: string,
    actionType: ActionType,
    parameters: InputJsonValue,
  ): Promise<void> {
    await this.actionDAO.createAction({
      actionType,
      targetType: ActionTargetType.PERSON,
      targetUid: personUid,
      path: 'identifiers',
      parameters,
      personUid,
    })
  }

  /**
   * Manually add a non-authenticated identifier (create-only). Value changes
   * are handled as remove-then-add, so this throws {@link IdentifierConflictError}
   * (surfaced as a 409) when an identifier already exists.
   */
  async addIdentifier(
    personUid: string,
    identifier: PersonIdentifier,
  ): Promise<void> {
    try {
      await this.personDAO.createIdentifier(identifier, personUid)
    } catch (error) {
      if (error instanceof IdentifierConflictError) throw error
      const message = `Error adding identifier (type=${identifier.type}, value=${identifier.value}, personUid=${personUid})`
      console.error(message, error)
      throw new Error(message)
    }
    const payload: IdentifierMessagePayload = {
      ...identifier.toJson(),
      authenticated: false,
    }
    await this.recordIdentifierAction(personUid, ActionType.ADD, {
      identifier: payload,
    })
  }

  /**
   * Persist an authenticated ORCID (base row + encrypted OAuth extension) and
   * emit an ADD (when the ORCID did not exist) or UPDATE (in-place
   * authentication of an existing value) message marked authenticated.
   */
  async authenticateOrcidIdentifier(
    personUid: string,
    identifier: ORCIDIdentifier,
  ): Promise<void> {
    try {
      const existed =
        (await this.personDAO.findIdentifierValue(
          personUid,
          PersonIdentifierType.orcid,
        )) !== null

      const persisted = await this.personDAO.upsertIdentifier(
        identifier,
        personUid,
      )
      await this.personDAO.upsertOrcidIdentifierExtension(
        persisted.id,
        identifier,
      )

      const payload: IdentifierMessagePayload = {
        ...identifier.toJson(),
        authenticated: true,
      }
      await this.recordIdentifierAction(
        personUid,
        existed ? ActionType.UPDATE : ActionType.ADD,
        { identifier: payload },
      )
    } catch (error) {
      const message = `Error authenticating ORCID identifier (personUid=${personUid}, value=${identifier.value})`
      console.error(message, error)
      throw new Error(message)
    }
  }

  /**
   * Persist an authenticated idHAL. The companion `hal_login` is written but
   * emits no message of its own — it is internal (it marks the idHAL as
   * authenticated and feeds HAL deposits). Emits ADD (new idHAL) or UPDATE
   * (in-place authentication of an existing value) for the idHAL, authenticated.
   */
  async authenticateHalIdentifier(
    personUid: string,
    params: {
      type: PersonIdentifierType
      value: string
      halLogin: string
    },
  ): Promise<void> {
    const { type, value, halLogin } = params
    try {
      const existed =
        (await this.personDAO.findIdentifierValue(personUid, type)) !== null

      // hal_login is written silently (no Action / no outgoing message).
      await this.personDAO.upsertIdentifier(
        new PersonIdentifier(PersonIdentifierType.hal_login, halLogin),
        personUid,
      )
      const identifier = new PersonIdentifier(type, value)
      await this.personDAO.upsertIdentifier(identifier, personUid)

      const payload: IdentifierMessagePayload = {
        ...identifier.toJson(),
        authenticated: true,
      }
      await this.recordIdentifierAction(
        personUid,
        existed ? ActionType.UPDATE : ActionType.ADD,
        { identifier: payload },
      )
    } catch (error) {
      const message = `Error authenticating HAL identifier (type=${type}, value=${value}, personUid=${personUid})`
      console.error(message, error)
      throw new Error(message)
    }
  }

  async removeIdentifier(
    personUid: string,
    type: PersonIdentifierType,
  ): Promise<void> {
    try {
      const value = await this.personDAO.findIdentifierValue(personUid, type)
      await this.personDAO.deleteIdentifier(personUid, type)
      await this.recordIdentifierAction(personUid, ActionType.REMOVE, {
        type,
        value,
      })
    } catch (error) {
      const message = `Error removing identifier (type=${type}, personUid=${personUid})`
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
