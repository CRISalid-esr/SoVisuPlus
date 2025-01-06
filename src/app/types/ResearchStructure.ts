import { Agent } from './Agent'

class ResearchStructure extends Agent {
  constructor(
    id: string,
    email: string,
    displayName: string,
    firstName: string,
    lastName: string,
  ) {
    super(id, email, displayName, firstName, lastName) // Call the parent constructor
  }
}

export { ResearchStructure }
