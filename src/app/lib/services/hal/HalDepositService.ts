import { HalDepositStatus } from '@prisma/client'
import { HalDepositDAO } from '@/lib/daos/HalDepositDAO'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { HalDepositPackager } from '@/lib/services/hal/HalDepositPackager'
import { HalSwordClient, SwordResponse } from '@/lib/services/hal/HalSwordClient'
import { HalSwordResponseParser } from '@/lib/services/hal/HalSwordResponseParser'
import { HalOnBehalfOfBuilder } from '@/lib/services/hal/HalOnBehalfOfBuilder'
import { WebSocketNotifier } from '@/lib/websocket/WebSocketNotifier'
import { GenericEvent } from '@/types/GenericEvent'
import { HalDepositEvent } from '@/types/HalDepositEvent'
import { HalDeposit } from '@/types/HalDeposit'

export interface DepositNotifier {
  notifyClients(event: GenericEvent): void
}

/** Minutes a deposit may sit in `running` before it is considered stale and reset. */
export const STALE_THRESHOLD_MINUTES = 10
/** Exponential backoff cap (4 hours). */
const MAX_BACKOFF_MINUTES = 240
/** HAL status-endpoint values we accept as a moderation outcome. */
const HAL_OUTCOME_STATUSES = new Set<HalDepositStatus>([
  HalDepositStatus.verify,
  HalDepositStatus.accept,
  HalDepositStatus.update,
  HalDepositStatus.delete,
  HalDepositStatus.replace,
])

/**
 * Orchestrates the HAL deposit lifecycle: it is the single entry point the listener schedules.
 * Holds all business logic; collaborators are injected so it can be unit-tested in isolation.
 */
export class HalDepositService {
  constructor(
    private readonly deposits: HalDepositDAO = new HalDepositDAO(),
    private readonly documents: DocumentDAO = new DocumentDAO(),
    private readonly persons: PersonDAO = new PersonDAO(),
    private readonly packager: HalDepositPackager = new HalDepositPackager(),
    private readonly sword: HalSwordClient = new HalSwordClient(),
    private readonly notifier: DepositNotifier = WebSocketNotifier,
  ) {}

  /** Submit every pending deposit whose retry window has elapsed. */
  async processDuePendingDeposits(now: Date = new Date()): Promise<void> {
    const due = await this.deposits.findDuePending(now)
    for (const deposit of due) {
      await this.processOne(deposit, now)
    }
  }

  private async processOne(deposit: HalDeposit, now: Date): Promise<void> {
    // The pending→running flip is the lock; if we don't win it, someone else is handling it.
    if (!(await this.deposits.claimPending(deposit.id, now))) return

    try {
      const document = await this.documents.fetchDocumentById(deposit.documentUid)
      if (!document) {
        await this.fail(deposit, 'terminal', 'Document not found', now)
        return
      }

      const person = await this.persons.fetchPersonByUid(deposit.personUid)
      const onBehalfOf = person
        ? HalOnBehalfOfBuilder.build(person.getIdentifiers())
        : null
      if (!onBehalfOf) {
        await this.fail(
          deposit,
          'terminal',
          'Person is missing HAL identifiers (hal_login + idhals/idhali)',
          now,
        )
        return
      }

      const artifact = await this.packager.package(deposit, document)
      const response = await this.sword.deposit(artifact, onBehalfOf)
      await this.handleDepositResponse(deposit, response, now)
    } catch (err) {
      // Network / disk / unexpected errors are transient → retry with backoff.
      await this.fail(deposit, 'retryable', this.message(err), now)
    }
  }

  private async handleDepositResponse(
    deposit: HalDeposit,
    response: SwordResponse,
    now: Date,
  ): Promise<void> {
    if (response.status === 202 || response.status === 201) {
      const parsed = HalSwordResponseParser.parseDepositEntry(response.body)
      const status =
        response.status === 202
          ? HalDepositStatus.accept // XML-only, immediately published
          : HalDepositStatus.verify // ZIP, under moderation
      const updated = await this.deposits.updateAfterDeposit(deposit.id, {
        halId: parsed.halId,
        halPassword: parsed.halPassword,
        halVersion: parsed.halVersion,
        halUrl: parsed.halUrl,
        status,
      })
      this.broadcast(updated)
      return
    }

    const kind = this.isRetryableStatus(response.status) ? 'retryable' : 'terminal'
    const message = `HAL responded ${response.status}: ${response.body?.slice(0, 500) ?? ''}`
    await this.fail(deposit, kind, message, now)
  }

  private isRetryableStatus(status: number): boolean {
    return status >= 500 || status === 408 || status === 429
  }

  private async fail(
    deposit: HalDeposit,
    kind: 'retryable' | 'terminal',
    message: string,
    now: Date,
  ): Promise<void> {
    if (kind === 'terminal') {
      await this.deposits.markError(deposit.id, message)
    } else {
      await this.deposits.registerFailure(
        deposit.id,
        deposit.retryCount + 1,
        this.computeNextRetryAt(deposit.retryCount, now),
        message,
      )
    }
    this.broadcast(await this.deposits.findById(deposit.id))
  }

  /** `now + min(2^retryCount, 240) minutes` — the exponential backoff schedule. */
  private computeNextRetryAt(retryCount: number, now: Date): Date {
    const delayMinutes = Math.min(2 ** retryCount, MAX_BACKOFF_MINUTES)
    return new Date(now.getTime() + delayMinutes * 60_000)
  }

  /**
   * Reset deposits stuck in `running` back to `pending`. Pass `0` at listener startup to release
   * everything (crash recovery); the periodic call uses the 10-minute staleness threshold.
   */
  async recoverStaleDeposits(
    olderThanMinutes: number = STALE_THRESHOLD_MINUTES,
    now: Date = new Date(),
  ): Promise<void> {
    const threshold = new Date(now.getTime() - olderThanMinutes * 60_000)
    const stale = await this.deposits.findStaleRunning(threshold)
    for (const deposit of stale) {
      await this.deposits.resetToPending(
        deposit.id,
        this.computeNextRetryAt(deposit.retryCount, now),
      )
    }
  }

  /** Background poll of `verify` deposits for a moderation outcome. */
  async pollVerifyDeposits(): Promise<void> {
    const verifying = await this.deposits.findVerify()
    for (const deposit of verifying) {
      await this.refreshStatus(deposit)
    }
  }

  /** Handle on-demand refresh requests (verify/update/delete) signalled by the web process. */
  async processRefreshRequests(): Promise<void> {
    const requested = await this.deposits.findRefreshRequested()
    for (const deposit of requested) {
      await this.refreshStatus(deposit)
      await this.deposits.clearRefreshRequest(deposit.id)
    }
  }

  private async refreshStatus(deposit: HalDeposit): Promise<void> {
    if (!deposit.halId) return
    const response = await this.sword.getStatus(deposit.halId)
    if (response.status !== 200) return

    const parsed = HalSwordResponseParser.parseStatus(response.body)
    const status = this.mapHalStatus(parsed.status)
    if (!status) return
    if (status === deposit.status && parsed.comment === deposit.comment) return

    const updated = await this.deposits.updateStatusFromHal(
      deposit.id,
      status,
      parsed.comment,
    )
    this.broadcast(updated)
  }

  private mapHalStatus(value: string | null): HalDepositStatus | null {
    if (!value) return null
    const candidate = value as HalDepositStatus
    return HAL_OUTCOME_STATUSES.has(candidate) ? candidate : null
  }

  private broadcast(deposit: HalDeposit | null): void {
    if (!deposit) return
    this.notifier.notifyClients(
      new HalDepositEvent(
        deposit.id,
        deposit.documentUid,
        deposit.personUid,
        deposit.status,
        deposit.halId,
        deposit.halUrl,
        deposit.comment,
        deposit.lastError,
      ),
    )
  }

  private message(err: unknown): string {
    return err instanceof Error ? err.message : String(err)
  }
}
