import IdrefControl from './IdrefControl'
import OrcidControl from './OrcidControl'

import { PersonIdentifierType } from '@/types/PersonIdentifier'

export const identifierComponentMap: Record<
  PersonIdentifierType,
  React.ComponentType | null
> = {
  [PersonIdentifierType.IDREF]: IdrefControl,
  [PersonIdentifierType.ORCID]: OrcidControl,
  [PersonIdentifierType.LOCAL]: null,
  [PersonIdentifierType.ID_HAL_S]: null,
  [PersonIdentifierType.ID_HAL_I]: null,
  [PersonIdentifierType.SCOPUS_EID]: null,
}
