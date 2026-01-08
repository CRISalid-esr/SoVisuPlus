import { OAStatus } from '@prisma/client'
import { ComponentType } from 'react'
import { LockOutlined } from '@mui/icons-material'
import BlockIcon from '@mui/icons-material/Block'

export const OAStatusProperties: Record<
  OAStatus | 'UNKNOWN',
  { color: string; icon?: ComponentType }
> = {
  [OAStatus.CLOSED]: { color: '#f23427', icon: LockOutlined },
  [OAStatus.GREEN]: { color: '#2fb028' },
  [OAStatus.DIAMOND]: { color: '#5595d9' },
  [OAStatus.GOLD]: { color: '#f5b01b' },
  [OAStatus.BRONZE]: { color: '#eb8036' },
  [OAStatus.HYBRID]: { color: '#7b28bf' },
  [OAStatus.OTHER]: { color: '#eb6580' }, // or #de5f72
  ['UNKNOWN']: { color: '#81888f', icon: BlockIcon },
}
