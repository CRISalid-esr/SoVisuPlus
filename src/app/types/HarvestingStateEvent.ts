import { BibliographicPlatform } from '@/types/BibliographicPlatform'

export const harvestingStates = [
  'running',
  'completed',
  'failed',
  'stopped',
] as const

export type HarvestingState = (typeof harvestingStates)[number]

export function isHarvestingState(value: string): value is HarvestingState {
  return (harvestingStates as readonly string[]).includes(value)
}

export class HarvestingStateEvent {
  constructor(
    public readonly platform: BibliographicPlatform,
    public readonly personUid: string,
    public readonly state: HarvestingState,
  ) {}

  toJSON() {
    return {
      platform: this.platform,
      personUid: this.personUid,
      state: this.state,
    }
  }
}
