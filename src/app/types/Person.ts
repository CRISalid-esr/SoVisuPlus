import { AgentIdentifier } from '@/types/AgentIdentifier'

type Person = {
  uid: string
  email: string
  displayName: string
  firstName: string
  lastName: string
  identifiers: AgentIdentifier[]
}

export type { Person }
