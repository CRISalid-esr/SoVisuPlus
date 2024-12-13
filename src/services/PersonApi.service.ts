import { DataService } from './Data.service'
import { AgentIdentifier } from '../app/types/agentIdentifier'
import { Person } from '../app/types/person'

// Assuming the base service is in a separate file.

export class PersonApiService extends DataService {
  constructor() {
    super(process.env.APOLLO_SERVER_URL || 'http://localhost:4000/graphql')
  }

  public async getPerson(AgentIdentifier: AgentIdentifier): Promise<Person> {
    const query = `
          query getPerson($AgentIdentifier: AgentIdentifier!) {
            person(AgentIdentifier: $AgentIdentifier) {
              id
              email
            }`
    const variables = { AgentIdentifier }
    return this.query<Person>(query, variables)
  }
}
