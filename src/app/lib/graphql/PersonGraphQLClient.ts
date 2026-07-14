import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { Person } from '@/types/Person'
import { loadQuery } from '@/lib/graphql/queries/loadQuery'
import { ExternalPerson } from '@/types/ExternalPerson'
import { InternalPerson } from '@/types/InternalPerson'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { Literal } from '@/types/Literal'
import { organizationIdentifierTypeFromString } from '@/types/OrganizationUnitIdentifier'
import {
  categoryFromGraphNode,
  genericTypeFromCategory,
} from '@/lib/graphql/organizationHydration'
import { PersonMembership } from '@/types/PersonMembership'
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
  identifiers: GraphOrganizationIdentifier[]
  names: GraphOrganizationName[]
  types?: string[]
  generic_type?: string
  national_type?: string | null
  external?: boolean
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
  recorded_by: GraphSourcePersonResponse[]
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

    person.records = personData.recorded_by.map(
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
    return (
      connection?.edges
        ?.map((edge) => {
          const organizationUnit = this.hydrateOrganization(edge.node)
          if (!organizationUnit) {
            return null
          }
          return new PersonMembership(
            organizationUnit,
            edge.properties.start_date ?? null,
            edge.properties.end_date ?? null,
            edge.properties.position_code ?? null,
          )
        })
        .filter((membership) => membership !== null) ?? []
    )
  }

  private hydrateOrganization(
    node: GraphOrganization,
  ): OrganizationUnit | null {
    const category = categoryFromGraphNode(node.types, node.generic_type)
    if (!category) {
      console.error(
        `Cannot determine category of organization ${node.uid} ` +
          `(labels: [${node.types?.join(', ') ?? ''}], generic_type: ${node.generic_type ?? 'unknown'}), skipping`,
      )
      return null
    }
    return new OrganizationUnit(
      node.uid,
      node.acronym ?? null,
      node.names.map((name) =>
        Literal.fromObject({
          language: name.language ?? null,
          value: name.value,
        }),
      ),
      [],
      category,
      genericTypeFromCategory(category),
      node.national_type ?? null,
      node.identifiers.map((identifier) => ({
        type: organizationIdentifierTypeFromString(identifier.type),
        value: identifier.value,
      })),
      null,
      node.external ?? false,
    )
  }
}
