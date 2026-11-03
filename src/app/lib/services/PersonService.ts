import { IdentifierConflictError, PersonDAO } from '@/lib/daos/PersonDAO'
import { Person } from '@/types/Person'
import {
  ID_HAL_TYPES,
  IdHalForms,
  idHalFormsToIdentifiers,
  isIdHalType,
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { ActionDAO, CreateActionParams } from '@/lib/daos/ActionDAO'
import { ActionTargetType, ActionType } from '@/types/Action'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'
import { InputJsonValue } from '@prisma/client/runtime/library'
import { AureHalAPIClient, idHalFormsOf } from '@/lib/services/AureHalAPIClient'

export class PersonService {
  private personDAO: PersonDAO
  private actionDAO: ActionDAO
  private aureHalClient: AureHalAPIClient

  constructor() {
    this.personDAO = new PersonDAO()
    this.actionDAO = new ActionDAO()
    this.aureHalClient = new AureHalAPIClient()
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
    await this.actionDAO.createAction(
      this.identifierAction(personUid, actionType, parameters),
    )
  }

  private identifierAction(
    personUid: string,
    actionType: ActionType,
    parameters: InputJsonValue,
  ): CreateActionParams {
    return {
      actionType,
      targetType: ActionTargetType.PERSON,
      targetUid: personUid,
      path: 'identifiers',
      parameters,
      personUid,
    }
  }

  /**
   * Manually add a non-authenticated identifier (create-only). Value changes
   * are handled as remove-then-add, so this throws {@link IdentifierConflictError}
   * (surfaced as a 409) when an identifier already exists. A manual add is made
   * by a privileged user, so the identifier is stored as validated. For an
   * idHAL, every form of the HAL account found in AureHAL is stored, and the add
   * is rejected when another person holds one of them.
   */
  async addIdentifier(
    personUid: string,
    identifier: PersonIdentifier,
  ): Promise<void> {
    let identifiers = [identifier]
    try {
      if (isIdHalType(identifier.type as PersonIdentifierType)) {
        identifiers = idHalFormsToIdentifiers(
          await this.resolveIdHalForms(
            identifier.type as PersonIdentifierType,
            identifier.value,
          ),
        )
        if (
          await this.isAnyIdentifierUsedByAnotherPerson(personUid, identifiers)
        ) {
          throw new IdentifierConflictError('used_by_another_person')
        }
      }
      await this.personDAO.createIdentifiers(
        identifiers.map(
          (added) => new PersonIdentifier(added.type, added.value, true),
        ),
        personUid,
        identifiers.map((added) =>
          this.identifierAction(personUid, ActionType.ADD, {
            identifier: added.toMessagePayload(false),
          }),
        ),
      )
    } catch (error) {
      if (error instanceof IdentifierConflictError) throw error
      const message = `Error adding identifier (type=${identifier.type}, value=${identifier.value}, personUid=${personUid})`
      console.error(message, error)
      throw new Error(message)
    }
  }

  /**
   * True when a person other than `personUid` holds one of the identifiers.
   */
  async isAnyIdentifierUsedByAnotherPerson(
    personUid: string,
    identifiers: PersonIdentifier[],
  ): Promise<boolean> {
    return this.personDAO.isAnyIdentifierHeldByAnotherPerson(
      personUid,
      identifiers,
    )
  }

  /**
   * Both idHAL forms of the HAL account behind a manually entered idHAL, looked
   * up in AureHAL. Falls back to the entered form alone when the account is not
   * found or AureHAL is down: a HAL outage must not block the add.
   */
  private async resolveIdHalForms(
    type: PersonIdentifierType,
    value: string,
  ): Promise<IdHalForms> {
    const entered: IdHalForms =
      type === PersonIdentifierType.idhals
        ? { idhals: value }
        : { idhali: value }
    try {
      const author = await this.aureHalClient.findAuthorByIdHal(
        value,
        type === PersonIdentifierType.idhals ? 'idhals' : 'idhali',
      )
      return author ? { ...idHalFormsOf(author), ...entered } : entered
    } catch (error) {
      console.error(
        `[AureHAL] lookup failed, only the entered idHAL is checked (${type}=${value})`,
        error,
      )
      return entered
    }
  }

  /**
   * Persist an authenticated ORCID (base row + encrypted OAuth extension) and
   * emit an ADD (when the ORCID did not exist) or UPDATE (in-place
   * authentication of an existing value) message marked authenticated.
   * Throws {@link IdentifierConflictError} when another person holds the ORCID.
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

      const payload = identifier.toMessagePayload(true)
      await this.recordIdentifierAction(
        personUid,
        existed ? ActionType.UPDATE : ActionType.ADD,
        { identifier: payload },
      )
    } catch (error) {
      if (error instanceof IdentifierConflictError) throw error
      const message = `Error authenticating ORCID identifier (personUid=${personUid}, value=${identifier.value})`
      console.error(message, error)
      throw new Error(message)
    }
  }

  /**
   * Persist the authenticated idHAL(s) of a HAL account: every form it has
   * (`forms`, as returned by AureHAL) is stored, so a missing form is added
   * next to the one already known. The companion `hal_login` is written but
   * emits no message of its own — it is internal (it marks the idHAL as
   * authenticated and feeds HAL deposits). Emits, for each idHAL form, ADD (new)
   * or UPDATE (in-place authentication of an existing value), authenticated.
   * Throws {@link IdentifierConflictError} when another person holds one of
   * the forms or the HAL login.
   */
  async authenticateHalIdentifier(
    personUid: string,
    params: {
      halLogin: string
      forms: IdHalForms
    },
  ): Promise<void> {
    const { halLogin, forms } = params
    const idHals = idHalFormsToIdentifiers(forms)
    try {
      // The HAL account is taken when another person holds one of its idHAL
      // forms or has authenticated with the same login.
      if (
        await this.isAnyIdentifierUsedByAnotherPerson(personUid, [
          ...idHals,
          new PersonIdentifier(PersonIdentifierType.hal_login, halLogin),
        ])
      ) {
        throw new IdentifierConflictError('used_by_another_person')
      }

      const storedTypes = new Set(
        (await this.personDAO.findIdentifiers(personUid, ID_HAL_TYPES)).map(
          (stored) => stored.type,
        ),
      )

      // hal_login is written silently (no Action / no outgoing message).
      await this.personDAO.upsertHalIdentifiers(
        personUid,
        idHals,
        halLogin,
        idHals.map((idHal) =>
          this.identifierAction(
            personUid,
            storedTypes.has(idHal.type) ? ActionType.UPDATE : ActionType.ADD,
            { identifier: idHal.toMessagePayload(true) },
          ),
        ),
      )
    } catch (error) {
      if (error instanceof IdentifierConflictError) throw error
      const message = `Error authenticating HAL identifier (idhals=${forms.idhals}, idhali=${forms.idhali}, personUid=${personUid})`
      console.error(message, error)
      throw new Error(message)
    }
  }

  /**
   * Validate an existing non-authenticated identifier without changing its
   * value. Validating an idHAL validates each of its stored forms. Emits an
   * UPDATE message (authenticated: false) per newly validated identifier, which
   * the graph handles as a validation.
   */
  async validateIdentifier(
    personUid: string,
    type: PersonIdentifierType,
  ): Promise<void> {
    try {
      const types = isIdHalType(type) ? ID_HAL_TYPES : [type]
      const stored = await this.personDAO.findIdentifiers(personUid, types)
      if (stored.length === 0) {
        throw new Error('Identifier not found')
      }
      const toValidate = stored.filter((identifier) => !identifier.validated)
      if (toValidate.length === 0) return
      await this.personDAO.markIdentifiersValidated(
        personUid,
        toValidate.map((identifier) => identifier.type as PersonIdentifierType),
        toValidate.map((identifier) =>
          this.identifierAction(personUid, ActionType.UPDATE, {
            identifier: identifier.toMessagePayload(false),
          }),
        ),
      )
    } catch (error) {
      const message = `Error validating identifier (type=${type}, personUid=${personUid})`
      console.error(message, error)
      throw new Error(message)
    }
  }

  /**
   * Remove an identifier and emit a REMOVE message per stored value (none when
   * nothing was stored). Removing an idHAL removes both its forms.
   */
  async removeIdentifier(
    personUid: string,
    type: PersonIdentifierType,
  ): Promise<void> {
    try {
      const types = isIdHalType(type) ? ID_HAL_TYPES : [type]
      const removed = await this.personDAO.findIdentifiers(personUid, types)
      await this.personDAO.deleteIdentifier(
        personUid,
        type,
        removed.map((identifier) =>
          this.identifierAction(personUid, ActionType.REMOVE, {
            type: identifier.type,
            value: identifier.value,
          }),
        ),
      )
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
