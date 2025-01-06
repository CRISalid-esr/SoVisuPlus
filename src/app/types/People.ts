import { Agent } from './Agent'

class People extends Agent {
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

export { People }
