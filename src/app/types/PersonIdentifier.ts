import { PersonIdentifierType as DbPersonIdentifierType } from '@prisma/client'

type PersonIdentifier = {
  type: DbPersonIdentifierType
  value: string
}

export type { PersonIdentifier }
export { DbPersonIdentifierType as PersonIdentifierType }
