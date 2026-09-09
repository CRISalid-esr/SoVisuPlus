import { EventBase } from '@/types/EventBase'
import { ChangeWarningFields } from '@/types/AMQPChangeEventMessage'

/**
 * Broadcast over WebSocket when the graph reports the outcome of a user
 * action (change applied or failed). `personUid` identifies the acting user
 * so the client only surfaces the outcome to them (mirrors
 * `HalDepositEvent.personUid`). `objectLabels` is enriched from the local DB
 * because the graph payload carries no document labels.
 */
export class UserActionOutcomeEvent extends EventBase {
  readonly type = 'user_action_outcome'

  constructor(
    public readonly actionId: string,
    public readonly outcome: 'applied' | 'failed',
    public readonly personUid: string,
    public readonly targetType: string,
    public readonly targetUid: string,
    public readonly path: string | null,
    public readonly actionType: string,
    public readonly errorMessage: string | null,
    public readonly warnings: ChangeWarningFields[] = [],
    public readonly objectLabels: Record<string, string> = {},
    public readonly timestamp: string | null = null,
  ) {
    super()
  }

  toJSON() {
    return {
      type: this.type,
      actionId: this.actionId,
      outcome: this.outcome,
      personUid: this.personUid,
      targetType: this.targetType,
      targetUid: this.targetUid,
      path: this.path,
      actionType: this.actionType,
      errorMessage: this.errorMessage,
      warnings: this.warnings,
      objectLabels: this.objectLabels,
      timestamp: this.timestamp,
    }
  }
}
