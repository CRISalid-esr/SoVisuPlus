import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Chip } from '@mui/material'
import { t, Plural } from '@lingui/macro'

import useStore from '@/stores/global_store'
import { Document } from '@/types/Document'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import AttachFileOffIcon from '@/app/theme/icons/AttachFileOffIcon'

const halSubmitTypeToHalSubmitTypeIcon = (halSubmitType: string | null) => {
  switch (halSubmitType) {
    case 'annex':
    case 'file':
      return <AttachFileIcon />
    case 'notice':
      return <AttachFileOffIcon />
    default:
      return null
  }
}

const multilineChipSx = {
  height: 'auto',
  padding: '.1875rem 0',
  '& .MuiChip-label': {
    display: 'block',
    whiteSpace: 'normal',
  },
}

export default function HalStatusCell({
  row,
}: {
  row: { original: Document }
}) {
  const { currentPerspective } = useStore((state) => state.user)

  const halRecord = row.original.records.find(
    (record) => record.platform === BibliographicPlatform.HAL,
  )

  if (!halRecord) {
    return (
      <Chip
        sx={multilineChipSx}
        label={t`documents_page_hal_status_outside_hal`}
        size='small'
        color='error'
      />
    )
  }

  const { halSubmitType } = halRecord
  const halSubmitTypeIcon = halSubmitTypeToHalSubmitTypeIcon(halSubmitType)

  const isInCollection =
    halRecord.isResearchStructureInCollectionCodes(currentPerspective)

  const acronyms = currentPerspective?.membershipAcronyms || []
  const numberOfAcronyms = acronyms.length
  const formattedAcronyms = acronyms.join(', ')

  return (
    <Chip
      sx={multilineChipSx}
      {...(halSubmitTypeIcon && { icon: halSubmitTypeIcon })}
      label={
        isInCollection
          ? t`documents_page_hal_status_in_collection`
          : `${t`documents_page_hal_status_out_of_collection`} ${currentPerspective?.membershipAcronyms?.join(', ')}`
      }
      size='small'
      color={isInCollection ? 'success' : 'warning'}
    />
  )
}
