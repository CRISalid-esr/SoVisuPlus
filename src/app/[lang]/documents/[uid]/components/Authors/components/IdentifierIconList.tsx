import { Box, Stack, Tooltip } from '@mui/material'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { WorkingIdentifier } from '../lib/types'

const ICON_BY_TYPE: Record<string, string> = {
  [PersonIdentifierType.orcid]: '/icons/orcid.png',
  [PersonIdentifierType.idref]: '/icons/idref.png',
  [PersonIdentifierType.idhals]: '/icons/hal.png',
  [PersonIdentifierType.idhali]: '/icons/hal.png',
  [PersonIdentifierType.scopus]: '/icons/scopus.png',
}

// Display order: ORCID, IdRef, IdHAL, Scopus.
const DISPLAY_ORDER: string[] = [
  PersonIdentifierType.orcid,
  PersonIdentifierType.idref,
  PersonIdentifierType.idhals,
  PersonIdentifierType.idhali,
  PersonIdentifierType.scopus,
]

const IdentifierIconList = ({
  identifiers,
}: {
  identifiers: WorkingIdentifier[]
}) => {
  const ordered = [...identifiers]
    .filter((id) => ICON_BY_TYPE[id.type])
    .sort(
      (a, b) => DISPLAY_ORDER.indexOf(a.type) - DISPLAY_ORDER.indexOf(b.type),
    )

  if (ordered.length === 0) return null

  return (
    <Stack direction='row' spacing={0.5} alignItems='center'>
      {ordered.map((id) => (
        <Tooltip key={`${id.type}-${id.value}`} title={id.value} arrow>
          <Box
            component='img'
            src={ICON_BY_TYPE[id.type]}
            alt={id.type}
            sx={{ width: 18, height: 18, objectFit: 'contain' }}
          />
        </Tooltip>
      ))}
    </Stack>
  )
}

export default IdentifierIconList
