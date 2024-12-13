import { DataService } from './data.service' // Assuming the base service is in a separate file.
type Person = {
  id: string
  email: string
}

type AgentIdentifier = {
  type: string
  value: string
}

export class PersonDataService extends DataService {
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
