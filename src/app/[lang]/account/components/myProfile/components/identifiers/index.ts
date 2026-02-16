import IdrefControl from './IdrefControl'
import OrcidControl from './OrcidControl'
import HalControl from '@/app/[lang]/account/components/myProfile/components/identifiers/HalControl'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

export const identifierComponentMap: Record<
  PersonIdentifierType,
  React.ComponentType | null
> = {
  [PersonIdentifierType.idref]: IdrefControl,
  [PersonIdentifierType.orcid]: OrcidControl,
  [PersonIdentifierType.local]: null,
  [PersonIdentifierType.idhals]: HalControl,
  [PersonIdentifierType.idhali]: null,
  [PersonIdentifierType.scopus]: null,
  [PersonIdentifierType.eppn]: null,
  [PersonIdentifierType.hal_login]: null,
}
