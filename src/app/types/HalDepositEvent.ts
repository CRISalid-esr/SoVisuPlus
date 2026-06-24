import { EventBase } from '@/types/EventBase'
import { HalDepositStatus } from '@prisma/client'

/**
 * Broadcast over WebSocket whenever a deposit's status changes, so the document page updates in
 * real time. `documentUid`/`personUid` let the client filter for relevance (mirrors
 * `DataEvent.impliedPeopleUids`).
 */
export class HalDepositEvent extends EventBase {
  readonly type = 'hal_deposit'

  constructor(
    public readonly depositId: number,
    public readonly documentUid: string,
    public readonly personUid: string,
    public readonly status: HalDepositStatus,
    public readonly halId: string | null = null,
    public readonly halUrl: string | null = null,
    public readonly comment: string | null = null,
    public readonly lastError: string | null = null,
  ) {
    super()
  }

  toJSON() {
    return {
      type: this.type,
      depositId: this.depositId,
      documentUid: this.documentUid,
      personUid: this.personUid,
      status: this.status,
      halId: this.halId,
      halUrl: this.halUrl,
      comment: this.comment,
      lastError: this.lastError,
    }
  }
}
