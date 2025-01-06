class Agent {
  id: string
  email: string
  displayName: string
  firstName: string
  lastName: string

  constructor(
    id: string,
    email: string,
    displayName: string,
    firstName: string,
    lastName: string,
  ) {
    this.id = id
    this.email = email
    this.displayName = displayName
    this.firstName = firstName
    this.lastName = lastName
  }

  getInfo(): string {
    return `${this.displayName} (${this.email})`
  }
}

export { Agent }
