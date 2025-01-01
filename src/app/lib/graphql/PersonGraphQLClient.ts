import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import { AgentIdentifier } from '@/types/AgentIdentifier'
import { Person } from '@/types/Person'
import PeopleQuery from './queries/people.graphql'

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

export interface GraphPeopleResponse {
  people: Array<{
    uid: string
    display_name: string
    identifiers: Array<GraphAgentIdentifier>
    names: Array<GraphPersonName>
  }>
}

export class PersonGraphQLClient extends AbstractGraphQLClient {
  public async getPerson(
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

    const response: GraphPeopleResponse = await this.query<GraphPeopleResponse>(
      PeopleQuery,
      variables,
    )
    const [personData] = response.people // Assuming the query returns an array and we need the first match

    if (!personData) {
      return null
    }
    return this.hydrate(personData)
  }

  private hydrate(personData: {
    uid: string
    display_name: string
    identifiers: AgentIdentifier[]
    names: Array<GraphPersonName>
  }) {
    return {
      uid: personData.uid,
      display_name: personData.display_name,
      identifiers: personData.identifiers.map(
        (identifier: AgentIdentifier) => ({
          type: identifier.type,
          value: identifier.value,
        }),
      ),
      first_name: personData.names[0]?.first_names[0]?.value,
      last_name: personData.names[0]?.last_names[0]?.value,
      email: '',
    }
  }
}
