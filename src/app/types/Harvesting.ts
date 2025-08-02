import { BibliographicPlatform } from '@/types/BibliographicPlatform'

export type HarvestingStatus =
  | 'not_performed'
  | 'running'
  | 'completed'
  | 'failed'
  | 'pending'
  | 'not_applicable'

export interface HarvestingResult {
  created: number
  updated: number
  unchanged: number
  deleted: number
}

export class Harvesting {
  personUid: string
  platform: BibliographicPlatform
  status: HarvestingStatus
  result: HarvestingResult
  selected: boolean

  constructor(
    personUid: string,
    platform: BibliographicPlatform,
    status: HarvestingStatus = 'not_performed',
    result: HarvestingResult = {
      created: 0,
      updated: 0,
      unchanged: 0,
      deleted: 0,
    },
    selected = false,
  ) {
    this.personUid = personUid
    this.platform = platform
    this.status = status
    this.result = result
    this.selected = selected
  }
}
