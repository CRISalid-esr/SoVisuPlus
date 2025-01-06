import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import { AgentIdentifier } from '@/types/AgentIdentifier'
import { Person } from '@/types/Person'
import { loadQuery } from '@/lib/graphql/queries/loadQuery'

interface GraphAgentIdentifier {
  type: string
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

interface GraphPersonResponse {
  uid: string
  display_name: string
  external: boolean
  identifiers: Array<GraphAgentIdentifier>
  names: Array<GraphPersonName>
}

export interface GraphPeopleResponse {
  people: Array<GraphPersonResponse>
}

export class PersonGraphQLClient extends AbstractGraphQLClient {
  /**
   * Get a person by one of their identifiers
   * @param agentIdentifier
   * @returns The person if found, null otherwise
   */
  public async getPersonByIdentifier(
    agentIdentifier: AgentIdentifier,
  ): Promise<Person | null> {
    const variables = {
      where: {
        AND: [
          {
            identifiers_SOME: {
              type_EQ: agentIdentifier.type, // Assuming `type` exists in AgentIdentifier
              value_EQ: agentIdentifier.value, // Assuming `value` exists in AgentIdentifier
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

  private hydrate(personData: GraphPersonResponse): Person {
    return {
      uid: personData.uid,
      displayName: personData.display_name,
      external: personData.external,
      identifiers: personData.identifiers.map(
        (identifier: AgentIdentifier) => ({
          type: identifier.type,
          value: identifier.value,
        }),
      ),
      firstName: personData.names[0]?.first_names[0]?.value,
      lastName: personData.names[0]?.last_names[0]?.value,
      email: null,
    }
  }
}
