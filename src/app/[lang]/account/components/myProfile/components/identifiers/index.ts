import IdrefControl from './IdrefControl'
import OrcidControl from './OrcidControl'
import HalControl from '@/app/[lang]/account/components/myProfile/components/identifiers/HalControl'
import { PersonIdentifierType as DbPersonIdentifierType } from '@prisma/client'

export const identifierComponentMap: Record<
  DbPersonIdentifierType,
  React.ComponentType | null
> = {
  [DbPersonIdentifierType.idref]: IdrefControl,
  [DbPersonIdentifierType.orcid]: OrcidControl,
  [DbPersonIdentifierType.local]: null,
  [DbPersonIdentifierType.idhals]: HalControl,
  [DbPersonIdentifierType.idhali]: null,
  [DbPersonIdentifierType.scopus]: null,
  [DbPersonIdentifierType.eppn]: null,
  [DbPersonIdentifierType.hal_login]: null,
}
