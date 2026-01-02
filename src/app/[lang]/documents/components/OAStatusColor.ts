import { OAStatus } from '@prisma/client'

export const OAStatusColor: Record<OAStatus, string> = {
  [OAStatus.CLOSED]: '#f23427',
  [OAStatus.GREEN]: '#2fb028',
  [OAStatus.DIAMOND]: '#5595d9',
  [OAStatus.GOLD]: '#f5b01b',
  [OAStatus.BRONZE]: '#eb8036',
  [OAStatus.HYBRID]: '#7b28bf',
  [OAStatus.OTHER]: '#81888f',
}
