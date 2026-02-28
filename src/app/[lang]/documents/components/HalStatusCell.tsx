import AttachFileIcon from '@mui/icons-material/AttachFile'

import useStore from '@/stores/global_store'
import { Document } from '@/types/Document'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import HalStatusCellBadge, { HalStatusCellType } from './HalStatusCellBadge'
import AttachFileOffIcon from '@/app/theme/icons/AttachFileOffIcon'
import { isPerson, Person } from '@/types/Person'
import {
  isResearchStructure,
  ResearchStructure,
} from '@/types/ResearchStructure'

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

const HalStatusCell = ({ row }: { row: { original: Document } }) => {
  const { currentPerspective } = useStore((state) => state.user)

  const halRecord = row.original.records.find(
    (record) => record.platform === BibliographicPlatform.HAL,
  )

  if (!halRecord) {
    if (isPerson(currentPerspective)) {
      const person = currentPerspective as Person
      return person.hasIdHAL() ? (
        <HalStatusCellBadge
          type={HalStatusCellType.OutsideHal}
          documentUid={row.original.uid}
        />
      ) : (
        <HalStatusCellBadge type={HalStatusCellType.OutsideHalMissingId} />
      )
    }
    if (isResearchStructure(currentPerspective)) {
      const structure = currentPerspective as ResearchStructure
      return structure.hasIdHAL() ? (
        <HalStatusCellBadge
          type={HalStatusCellType.OutsideHal}
          documentUid={row.original.uid}
        />
      ) : (
        <HalStatusCellBadge type={HalStatusCellType.OutsideHalMissingId} />
      )
    }
    return (
      <HalStatusCellBadge
        type={HalStatusCellType.OutsideHal}
        documentUid={row.original.uid}
      />
    )
  }

  const { url, halSubmitType } = halRecord
  const halSubmitTypeIcon = halSubmitTypeToHalSubmitTypeIcon(halSubmitType)

  const collections =
    halRecord.isResearchStructureInCollectionCodes(currentPerspective)

  const hasBeenUpdated = row.original.hasBeenUpdated()

  if (collections && !hasBeenUpdated) {
    return (
      <HalStatusCellBadge
        type={HalStatusCellType.InCollection}
        icon={halSubmitTypeIcon}
        halSubmitType={halSubmitType}
        acronyms={collections}
        halUrl={url}
      />
    )
  }

  const acronyms = currentPerspective?.membershipAcronyms || []

  return (
    <HalStatusCellBadge
      type={HalStatusCellType.NotInSyncWithCollection}
      icon={halSubmitTypeIcon}
      acronyms={acronyms}
      halSubmitType={halSubmitType}
      hasBeenUpdated={hasBeenUpdated}
      isOutOfCollection={!collections}
      halUrl={url}
      documentUid={row.original.uid}
    />
  )
}
export default HalStatusCell
