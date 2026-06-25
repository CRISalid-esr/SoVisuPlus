import { HarvestingResultEvent } from '@/types/HarvestingResultEvent'
import { HarvestingStateEvent } from '@/types/HarvestingStateEvent'
import { DataEvent } from '@/types/DataEvent'
import { HalDepositEvent } from '@/types/HalDepositEvent'

export type GenericEvent =
  | DataEvent
  | HarvestingStateEvent
  | HarvestingResultEvent
  | HalDepositEvent

export const isDataEvent = (event: GenericEvent): event is DataEvent =>
  event.type === 'data'

export const isHarvestingStateEvent = (
  event: GenericEvent,
): event is HarvestingStateEvent => event.type === 'harvesting_state'

export const isHarvestingResultEvent = (
  event: GenericEvent,
): event is HarvestingResultEvent => event.type === 'harvesting_result'

export const isHalDepositEvent = (
  event: GenericEvent,
): event is HalDepositEvent => event.type === 'hal_deposit'
