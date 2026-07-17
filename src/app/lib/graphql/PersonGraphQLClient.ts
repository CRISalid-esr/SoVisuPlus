import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { Person } from '@/types/Person'
import { loadQuery } from '@/lib/graphql/queries/loadQuery'
import { ExternalPerson } from '@/types/ExternalPerson'
import { InternalPerson } from '@/types/InternalPerson'
import {
  GraphOrganizationUnitNode,
  hydrateOrganizationNode,
} from '@/lib/graphql/organizationHydration'
import { PersonMembership } from '@/types/PersonMembership'
import { PersonEmployment } from '@/types/PersonEmployment'
import { SourcePerson } from '@/types/SourcePerson'
import { SourcePersonIdentifier } from '@/types/SourcePersonIdentifier'

export interface GraphPersonIdentifier {
  type: string
  value: string
}

export interface GraphSourcePersonIdentifierResponse {
  type: string
  value: string
}

export interface GraphSourcePersonResponse {
  uid: string
  name: string
  source: string
  source_identifier: string | null
  identifiers: GraphSourcePersonIdentifierResponse[]
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

interface GraphMembershipProperties {
  start_date?: string
  end_date?: string
  position_code?: string
}

interface GraphMembershipEdge {
  properties: GraphMembershipProperties
  node: GraphOrganizationUnitNode
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
  // Not exposed by the graph GraphQL API since the organization model
  // refactoring — source-person records stay empty until it is re-exposed.
  recorded_by?: GraphSourcePersonResponse[]
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
    const person = new personType(
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
      this.hydrateMemberships(personData.membershipsConnection),
    )

    person.employments = this.hydrateEmployments(
      personData.employmentsConnection,
    )

    person.records = (personData.recorded_by ?? []).map(
      (record: GraphSourcePersonResponse) =>
        new SourcePerson(
          record.uid,
          record.name,
          record.source,
          record.source_identifier,
          record.identifiers
            .map((identifier: GraphSourcePersonIdentifierResponse) => {
              try {
                return new SourcePersonIdentifier(
                  SourcePersonIdentifier.typeFromString(identifier.type),
                  identifier.value,
                )
              } catch {
                console.warn(
                  `Unsupported source identifier type for ${identifier.value}: ${identifier.type}`,
                )
                return null // Skip unsupported identifiers
              }
            })
            .filter((identifier) => identifier !== null), // Remove null entries
        ),
    )

    return person
  }

  /**
   * Hydrate membership edges into PersonMembership objects.
   * Edges whose organization category cannot be determined are skipped.
   */
  private hydrateMemberships(
    connection: GraphMembershipConnection | undefined,
  ): PersonMembership[] {
    return this.hydrateAffiliationEdges(
      connection,
      (organizationUnit, startDate, endDate, positionCode) =>
        new PersonMembership(
          organizationUnit,
          startDate,
          endDate,
          positionCode,
        ),
    )
  }

  /**
   * Hydrate employment edges into PersonEmployment objects.
   * Edges whose organization category cannot be determined are skipped.
   */
  private hydrateEmployments(
    connection: GraphMembershipConnection | undefined,
  ): PersonEmployment[] {
    return this.hydrateAffiliationEdges(
      connection,
      (organizationUnit, startDate, endDate, positionCode) =>
        new PersonEmployment(
          organizationUnit,
          startDate,
          endDate,
          positionCode,
        ),
    )
  }

  private hydrateAffiliationEdges<T>(
    connection: GraphMembershipConnection | undefined,
    factory: (
      organizationUnit: NonNullable<ReturnType<typeof hydrateOrganizationNode>>,
      startDate: string | null,
      endDate: string | null,
      positionCode: string | null,
    ) => T,
  ): T[] {
    return (
      connection?.edges
        ?.map((edge) => {
          const organizationUnit = hydrateOrganizationNode(edge.node)
          if (!organizationUnit) {
            return null
          }
          return factory(
            organizationUnit,
            edge.properties.start_date ?? null,
            edge.properties.end_date ?? null,
            edge.properties.position_code ?? null,
          )
        })
        .filter((item) => item !== null) ?? []
    )
  }
}
