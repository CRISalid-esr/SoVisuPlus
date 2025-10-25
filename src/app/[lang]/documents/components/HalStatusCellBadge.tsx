import { Plural } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Chip } from '@mui/material'

export enum HalStatusCellType {
  InCollection = 'InCollection',
  OutOfCollection = 'OutOfCollection',
  OutsideHal = 'OutsideHal',
}

const multilineChipSx = {
  height: 'auto',
  padding: '.1875rem 0',
  '& .MuiChip-label': {
    display: 'block',
    whiteSpace: 'normal',
  },
}

type HalStatusCellBadgeProps =
  | {
      type: HalStatusCellType.InCollection | HalStatusCellType.OutsideHal
      icon?: React.ReactElement | null
      acronyms?: string[]
      isSingleLine?: boolean
    }
  | {
      type: HalStatusCellType.OutOfCollection
      icon?: React.ReactElement | null
      acronyms: string[]
      isSingleLine?: boolean
    }

export default function HalStatusCellBadge({
  type,
  icon,
  acronyms,
  isSingleLine,
}: HalStatusCellBadgeProps) {
  if (type === HalStatusCellType.OutsideHal)
    return (
      <Chip
        {...(!isSingleLine && { sx: multilineChipSx })}
        label={t`documents_page_hal_status_outside_hal`}
        size='small'
        color='error'
      />
    )

  if (type === HalStatusCellType.OutOfCollection) {
    const numberOfAcronyms = acronyms?.length || 0
    const formattedAcronyms = acronyms?.join(', ') || ''

    return (
      <Chip
        {...(!isSingleLine && { sx: multilineChipSx })}
        {...(icon && { icon })}
        label={
          <Plural
            value={numberOfAcronyms}
            one={`documents_page_hal_status_out_of_collection ${formattedAcronyms}`}
            other={`documents_page_hal_status_out_of_collections ${formattedAcronyms}`}
          />
        }
        size='small'
        color='warning'
      />
    )
  }

  if (type === HalStatusCellType.InCollection) {
    return (
      <Chip
        {...(!isSingleLine && { sx: multilineChipSx })}
        {...(icon && { icon })}
        label={t`documents_page_hal_status_in_collection`}
        size='small'
        color='success'
      />
    )
  }
}
