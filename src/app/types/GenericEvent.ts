import { HarvestingResultEvent } from '@/types/HarvestingResultEvent'
import { HarvestingStateEvent } from '@/types/HarvestingStateEvent'
import { DataEvent } from '@/types/DataEvent'
import { HalDepositEvent } from '@/types/HalDepositEvent'
import { UserActionOutcomeEvent } from '@/types/UserActionOutcomeEvent'

export type GenericEvent =
  | DataEvent
  | HarvestingStateEvent
  | HarvestingResultEvent
  | HalDepositEvent
  | UserActionOutcomeEvent

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

export const isUserActionOutcomeEvent = (
  event: GenericEvent,
): event is UserActionOutcomeEvent => event.type === 'user_action_outcome'
