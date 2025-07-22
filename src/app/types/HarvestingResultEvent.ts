import { BibliographicPlatform } from '@/types/BibliographicPlatform'

export type HarvestingStatus = 'created' | 'updated' | 'deleted' | 'unchanged'

export class HarvestingResultEvent {
  constructor(
    public readonly platform: BibliographicPlatform,
    public readonly personUid: string,
    public readonly status: HarvestingStatus,
  ) {}

  toJSON() {
    return {
      platform: this.platform,
      personUid: this.personUid,
      status: this.status,
    }
  }
}
