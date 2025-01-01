import { AgentIdentifier } from '@/types/AgentIdentifier'

type Person = {
  uid: string
  email: string
  display_name: string
  first_name: string
  last_name: string
  identifiers: AgentIdentifier[]
}

export type { Person }
