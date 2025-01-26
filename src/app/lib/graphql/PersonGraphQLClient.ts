import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { Person } from '@/types/Person'
import { loadQuery } from '@/lib/graphql/queries/loadQuery'
import { ExternalPerson } from '@/types/ExternalPerson'
import { InternalPerson } from '@/types/InternalPerson'

enum GraphPersonIdentifierType {
  LOCAL = 'local',
  ORCID = 'orcid',
  IDREF = 'idref',
  SCOPUS_EID = 'scopus_eid',
  ID_HAL = 'id_hal',
  ID_HAL_S = 'id_hal_s',
}

export interface GraphPersonIdentifier {
  type: GraphPersonIdentifierType
  value: string
}

interface GraphPersonName {
  first_names: {
    value: string
  }[]
  last_names: {
    value: string
  }[]
}

export interface GraphPersonResponse {
  uid: string
  display_name: string
  external: boolean
  identifiers: Array<GraphPersonIdentifier>
  names: Array<GraphPersonName>
}

export interface GraphPeopleResponse {
  people: Array<GraphPersonResponse>
}

export class PersonGraphQLClient extends AbstractGraphQLClient {
  /**
   * Get a person by one of their identifiers
   * @param personIdentifier
   * @returns The person if found, null otherwise
   */
  public async getPersonByIdentifier(
    personIdentifier: PersonIdentifier,
  ): Promise<Person | null> {
    const variables = {
      where: {
        AND: [
          {
            identifiers_SOME: {
              type_EQ: personIdentifier.type.toLowerCase(),
              value_EQ: personIdentifier.value,
            },
          },
        ],
      },
    }
    const personQuery = loadQuery('person.graphql')

    const response: GraphPeopleResponse = await this.query<GraphPeopleResponse>(
      personQuery,
      variables,
    )
    const [personData] = response.people

    if (!personData) {
      return null
    }
    return this.hydrate(personData)
  }

  /**
   * Get a person by their UID
   * @param uid
   * @returns The person if found, null otherwise
   */
  public async getPersonByUid(uid: string): Promise<Person | null> {
    const variables = {
      where: {
        uid_EQ: uid,
      },
    }
    const personQuery = loadQuery('person.graphql')

    const response: GraphPeopleResponse = await this.query<GraphPeopleResponse>(
      personQuery,
      variables,
    )
    const [personData] = response.people

    if (!personData) {
      return null
    }
    return this.hydrate(personData)
  }

  public hydrate(personData: GraphPersonResponse): Person {
    const personType = personData.external ? ExternalPerson : InternalPerson
    return new personType(
      personData.uid,
      null,
      personData.display_name,
      personData.names[0]?.first_names[0]?.value,
      personData.names[0]?.last_names[0]?.value,
      personData.identifiers
        .map((identifier: GraphPersonIdentifier) => {
          try {
            return {
              type: this.convertGraphIdentifierType(identifier.type),
              value: identifier.value,
            }
          } catch {
            console.warn(
              `Unsupported identifier type for ${identifier.value}: ${identifier.type}`,
            )
            return null // Skip unsupported identifiers
          }
        })
        .filter((identifier) => identifier !== null), // Remove null entries
    )
  }

  private convertGraphIdentifierType(
    type: GraphPersonIdentifierType,
  ): PersonIdentifierType {
    switch (type) {
      case GraphPersonIdentifierType.LOCAL:
        return PersonIdentifierType.LOCAL
      case GraphPersonIdentifierType.ORCID:
        return PersonIdentifierType.ORCID
      case GraphPersonIdentifierType.IDREF:
        return PersonIdentifierType.IDREF
      case GraphPersonIdentifierType.SCOPUS_EID:
        return PersonIdentifierType.SCOPUS_EID
      case GraphPersonIdentifierType.ID_HAL:
        return PersonIdentifierType.ID_HAL_S
      case GraphPersonIdentifierType.ID_HAL_S:
        return PersonIdentifierType.ID_HAL_S
      default:
        throw new Error(`Unknown identifier type: ${type}`)
    }
  }
}
