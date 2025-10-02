import AttachFileIcon from '@mui/icons-material/AttachFile'

import useStore from '@/stores/global_store'
import { Document } from '@/types/Document'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import HalStatusCellBadge, { HalStatusCellType } from './HalStatusCellBadge'
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
    return <HalStatusCellBadge type={HalStatusCellType.OutsideHal} />
  }

  const { halSubmitType } = halRecord
  const halSubmitTypeIcon = halSubmitTypeToHalSubmitTypeIcon(halSubmitType)

  const isInCollection =
    halRecord.isResearchStructureInCollectionCodes(currentPerspective)

  if (isInCollection) {
    return (
      <HalStatusCellBadge
        type={HalStatusCellType.InCollection}
        icon={halSubmitTypeIcon}
      />
    )
  }

  const acronyms = currentPerspective?.membershipAcronyms || []

  return (
    <HalStatusCellBadge
      type={HalStatusCellType.OutOfCollection}
      icon={halSubmitTypeIcon}
      acronyms={acronyms}
    />
  )
}
