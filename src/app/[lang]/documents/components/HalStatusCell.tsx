import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Chip } from '@mui/material'
import { t } from '@lingui/macro'

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
      <Chip label={t`documents_page_outside_hal`} size='small' color='error' />
    )
  }

  const { halSubmitType } = halRecord
  const halSubmitTypeIcon = halSubmitTypeToHalSubmitTypeIcon(halSubmitType)

  const isInCollection =
    halRecord.isResearchStructureInCollectionCodes(currentPerspective)

  return (
    <Chip
      {...(halSubmitTypeIcon && { icon: halSubmitTypeIcon })}
      label={
        isInCollection
          ? t`documents_page_in_collection`
          : t`documents_page_out_of_collection`
      }
      size='small'
      color={isInCollection ? 'success' : 'warning'}
    />
  )
}
