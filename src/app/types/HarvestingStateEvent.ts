import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { EventBase } from '@/types/EventBase'

export const harvestingStates = [
  'running',
  'completed',
  'failed',
  'not_applicable',
] as const

export type HarvestingState = (typeof harvestingStates)[number]

export const isHarvestingState = (value: string): value is HarvestingState =>
  (harvestingStates as readonly string[]).includes(value)

export class HarvestingStateEvent extends EventBase {
  readonly type = 'harvesting_state'

  constructor(
    public readonly platform: BibliographicPlatform,
    public readonly personUid: string,
    public readonly state: HarvestingState,
  ) {
    super()
  }

  toJSON() {
    return {
      type: this.type,
      platform: this.platform,
      personUid: this.personUid,
      state: this.state,
    }
  }
}
