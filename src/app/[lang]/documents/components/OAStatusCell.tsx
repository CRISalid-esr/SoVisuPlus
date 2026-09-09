import AttachFileIcon from '@mui/icons-material/AttachFile'

import useStore from '@/stores/global_store'
import { Document } from '@/types/Document'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import HalStatusCellBadge, { HalStatusCellType } from './HalStatusCellBadge'
import AttachFileOffIcon from '@/app/theme/icons/AttachFileOffIcon'
import OAStatusCellBadge from '@/app/[lang]/documents/components/OAStatusCellBadge'
import { OAStatus } from '@prisma/client'

const OAStatusCell = ({ row }: { row: { original: Document } }) => {
  const defaultOAStatus = row.original.oaStatus
  const upwOAStatus = row.original.upwOAStatus

  const type =
    upwOAStatus && upwOAStatus !== 'CLOSED'
      ? upwOAStatus
      : (defaultOAStatus ?? upwOAStatus ?? 'UNKNOWN')

  return <OAStatusCellBadge type={type} />
}
export default OAStatusCell
