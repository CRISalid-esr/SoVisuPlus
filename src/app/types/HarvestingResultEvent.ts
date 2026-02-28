import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { EventBase } from '@/types/EventBase'

export type HarvestingStatus = 'created' | 'updated' | 'deleted' | 'unchanged'

export class HarvestingResultEvent extends EventBase {
  readonly type = 'harvesting_result'

  constructor(
    public readonly platform: BibliographicPlatform,
    public readonly personUid: string,
    public readonly status: HarvestingStatus,
  ) {
    super()
  }

  toJSON() {
    return {
      type: this.type,
      platform: this.platform,
      personUid: this.personUid,
      status: this.status,
    }
  }
}
