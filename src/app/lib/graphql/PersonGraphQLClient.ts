import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { Person } from '@/types/Person'
import { loadQuery } from '@/lib/graphql/queries/loadQuery'
import { ExternalPerson } from '@/types/ExternalPerson'
import { InternalPerson } from '@/types/InternalPerson'
import { ResearchUnit } from '@/types/ResearchUnit'
import { Literal } from '@/types/Literal'
import { researchUnitIdentifierTypeFromString } from '@/types/ResearchUnitIdentifier'

export interface GraphPersonIdentifier {
  type: string
  value: string
}

interface GraphPersonName {
  first_names: {
    language?: string
    value: string
  }[]
  last_names: {
    language?: string
    value: string
  }[]
}

interface GraphOrganizationIdentifier {
  type: string
  value: string
}

interface GraphOrganizationName {
  language?: string
  value: string
}

interface GraphOrganization {
  acronym?: string
  signature?: string
  identifiers: GraphOrganizationIdentifier[]
  names: GraphOrganizationName[]
  type: string
  uid: string
}

interface GraphMembershipProperties {
  start_date?: string
  end_date?: string
  position_code?: string
}

interface GraphMembershipEdge {
  properties: GraphMembershipProperties
  node: GraphOrganization
}

interface GraphMembershipConnection {
  edges: GraphMembershipEdge[]
}

export interface GraphPersonResponse {
  uid: string
  display_name: string | null
  external: boolean
  identifiers: GraphPersonIdentifier[]
  names: GraphPersonName[]
  membershipsConnection?: GraphMembershipConnection
  employmentsConnection?: GraphMembershipConnection
}

export interface GraphPeopleResponse {
  people: GraphPersonResponse[]
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
            return new PersonIdentifier(
              PersonIdentifier.typeFromString(identifier.type),
              identifier.value,
            )
          } catch {
            console.warn(
              `Unsupported identifier type for ${identifier.value}: ${identifier.type}`,
            )
            return null // Skip unsupported identifiers
          }
        })
        .filter((identifier) => identifier !== null), // Remove null entries
      personData.membershipsConnection?.edges?.map((edge) => ({
        researchUnit: new ResearchUnit(
          edge.node.uid,
          edge.node.acronym ?? null,
          edge.node.names.map((name) =>
            Literal.fromObject({
              language: name.language ?? null,
              value: name.value,
            }),
          ),
          [],
          edge.node.signature ?? null,
          edge.node.identifiers.map((identifier) => ({
            type: researchUnitIdentifierTypeFromString(identifier.type),
            value: identifier.value,
          })),
          'research_unit',
        ),
        startDate: edge.properties.start_date ?? null,
        endDate: edge.properties.end_date ?? null,
        positionCode: edge.properties.position_code ?? null,
      })) ?? [],
    )
  }
}
