import IdrefControl from './IdrefControl'
import OrcidControl from './OrcidControl'

import { PersonIdentifierType } from '@/types/PersonIdentifier'
import HalControl from '@/app/[lang]/account/components/myProfile/components/identifiers/HalControl'

export const identifierComponentMap: Record<
  PersonIdentifierType,
  React.ComponentType | null
> = {
  [PersonIdentifierType.IDREF]: IdrefControl,
  [PersonIdentifierType.ORCID]: OrcidControl,
  [PersonIdentifierType.LOCAL]: null,
  [PersonIdentifierType.ID_HAL_S]: HalControl,
  [PersonIdentifierType.ID_HAL_I]: null,
  [PersonIdentifierType.SCOPUS_EID]: null,
  [PersonIdentifierType.EPPN]: null,
}
