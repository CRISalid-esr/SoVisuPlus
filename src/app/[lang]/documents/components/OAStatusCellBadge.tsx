import AttachFileIcon from '@mui/icons-material/AttachFile'

import useStore from '@/stores/global_store'
import { Document } from '@/types/Document'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import HalStatusCellBadge, { HalStatusCellType } from './HalStatusCellBadge'
import AttachFileOffIcon from '@/app/theme/icons/AttachFileOffIcon'
import { Chip } from '@mui/material'
import { Lock, LockOpen, LockOutlined } from '@mui/icons-material'
import { OAStatus } from '@prisma/client'
import { OAStatusColor } from '@/app/[lang]/documents/components/OAStatusColor'
import { useTheme } from '@mui/system'

type OAStatusCellBadgeProps = {
  children?: React.ReactNode
  type?: OAStatus
}

export default function OAStatusCellBadge({ type }: OAStatusCellBadgeProps) {
  return (
    <Chip
      icon={
        type === OAStatus.CLOSED ? (
          <LockOutlined sx={{ fontSize: 'large' }} />
        ) : (
          <LockOpen sx={{ fontSize: 'large' }} />
        )
      }
      label={type}
      size='small'
      color='info'
      sx={{
        backgroundColor: type
          ? OAStatusColor[type]
          : OAStatusColor[OAStatus.CLOSED],
        padding: '1px',
      }}
    />
  )
}
