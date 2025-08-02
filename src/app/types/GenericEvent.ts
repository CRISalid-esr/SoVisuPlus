import { HarvestingResultEvent } from '@/types/HarvestingResultEvent'
import { HarvestingStateEvent } from '@/types/HarvestingStateEvent'
import { DataEvent } from '@/types/DataEvent'

export type GenericEvent =
  | DataEvent
  | HarvestingStateEvent
  | HarvestingResultEvent

export const isDataEvent = (event: GenericEvent): event is DataEvent =>
  event.type === 'data'

export const isHarvestingStateEvent = (
  event: GenericEvent,
): event is HarvestingStateEvent => event.type === 'harvesting_state'

export const isHarvestingResultEvent = (
  event: GenericEvent,
): event is HarvestingResultEvent => event.type === 'harvesting_result'
