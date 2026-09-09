import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { HalDepositStatus, Prisma } from '@prisma/client'
import { HalDeposit } from '@/types/HalDeposit'

/** Relations every deposit fetch needs: files, plus the related document/person uids. */
const depositInclude = {
  files: true,
  document: { select: { uid: true } },
  person: { select: { uid: true } },
} satisfies Prisma.HalDepositInclude

export interface CreateHalDepositParams {
  documentUid: string
  personUid: string
  halDocumentType: string
  halDomains: string[]
  language: string
  conferenceTitle?: string | null
  conferenceCity?: string | null
  conferenceStartDate?: string | null
  conferenceCountry?: string | null
  institution?: string | null
  bookTitle?: string | null
  supervisor?: string | null
}

export interface HalDepositFileInput {
  filePath: string
  fileName: string
  isMain: boolean
  mimeType: string
  fileSource: string
  fileType: string
  visibility: string
  license: string | null
}

export interface DepositResultUpdate {
  halId: string | null
  halPassword: string | null
  halVersion: number | null
  halUrl: string | null
  status: HalDepositStatus
}

export class HalDepositDAO extends AbstractDAO {
  /** Create a deposit in `pending` status (files are added separately, after disk write). */
  async createDeposit(params: CreateHalDepositParams): Promise<HalDeposit> {
    const db = await this.prismaClient.halDeposit.create({
      data: {
        document: { connect: { uid: params.documentUid } },
        person: { connect: { uid: params.personUid } },
        status: HalDepositStatus.pending,
        halDocumentType: params.halDocumentType,
        halDomains: params.halDomains,
        language: params.language,
        conferenceTitle: params.conferenceTitle ?? null,
        conferenceCity: params.conferenceCity ?? null,
        conferenceStartDate: params.conferenceStartDate ?? null,
        conferenceCountry: params.conferenceCountry ?? null,
        institution: params.institution ?? null,
        bookTitle: params.bookTitle ?? null,
        supervisor: params.supervisor ?? null,
      },
      include: depositInclude,
    })
    return HalDeposit.fromDb(db)
  }

  /** Attach uploaded files to an existing deposit (called after the files are on disk). */
  async addFiles(
    depositId: number,
    files: HalDepositFileInput[],
  ): Promise<HalDeposit> {
    if (files.length > 0) {
      await this.prismaClient.halDepositFile.createMany({
        data: files.map((f) => ({ ...f, halDepositId: depositId })),
      })
    }
    return this.requireById(depositId)
  }

  /** Cleanup helper when post-creation steps fail (orphan rows must not survive). */
  async deleteDeposit(id: number): Promise<void> {
    await this.prismaClient.halDeposit.delete({ where: { id } })
  }

  async findById(id: number): Promise<HalDeposit | null> {
    const db = await this.prismaClient.halDeposit.findUnique({
      where: { id },
      include: depositInclude,
    })
    return db ? HalDeposit.fromDb(db) : null
  }

  private async requireById(id: number): Promise<HalDeposit> {
    const deposit = await this.findById(id)
    if (!deposit) throw new Error(`HalDeposit ${id} not found`)
    return deposit
  }

  /** Latest deposit for a document (by updatedAt), regardless of which person triggered it. */
  async findLatestByDocumentUid(
    documentUid: string,
  ): Promise<HalDeposit | null> {
    const db = await this.prismaClient.halDeposit.findFirst({
      where: { document: { uid: documentUid } },
      orderBy: { updatedAt: 'desc' },
      include: depositInclude,
    })
    return db ? HalDeposit.fromDb(db) : null
  }

  /** Pending deposits whose retry window has elapsed. */
  async findDuePending(now: Date, limit = 20): Promise<HalDeposit[]> {
    const rows = await this.prismaClient.halDeposit.findMany({
      where: {
        status: HalDepositStatus.pending,
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: depositInclude,
    })
    return rows.map(HalDeposit.fromDb)
  }

  /**
   * Atomically claim a pending deposit by flipping it to `running`. The `status = pending`
   * guard makes this the lock: only one worker can win, so a slow submission cannot be
   * picked up twice. Returns true if this caller claimed it.
   */
  async claimPending(id: number, now: Date): Promise<boolean> {
    const { count } = await this.prismaClient.halDeposit.updateMany({
      where: { id, status: HalDepositStatus.pending },
      data: { status: HalDepositStatus.running, startedAt: now },
    })
    return count === 1
  }

  /** Deposits stuck in `running` longer than the staleness threshold. */
  async findStaleRunning(olderThan: Date, limit = 50): Promise<HalDeposit[]> {
    const rows = await this.prismaClient.halDeposit.findMany({
      where: {
        status: HalDepositStatus.running,
        startedAt: { lte: olderThan },
      },
      take: limit,
      include: depositInclude,
    })
    return rows.map(HalDeposit.fromDb)
  }

  /** Release a (stale or failed) deposit back to `pending`, scheduling the next attempt. */
  async resetToPending(id: number, nextRetryAt: Date | null): Promise<void> {
    await this.prismaClient.halDeposit.update({
      where: { id },
      data: {
        status: HalDepositStatus.pending,
        startedAt: null,
        nextRetryAt,
      },
    })
  }

  async findVerify(limit = 50): Promise<HalDeposit[]> {
    const rows = await this.prismaClient.halDeposit.findMany({
      where: { status: HalDepositStatus.verify },
      take: limit,
      include: depositInclude,
    })
    return rows.map(HalDeposit.fromDb)
  }

  async findRefreshRequested(limit = 50): Promise<HalDeposit[]> {
    const rows = await this.prismaClient.halDeposit.findMany({
      where: { refreshRequestedAt: { not: null } },
      take: limit,
      include: depositInclude,
    })
    return rows.map(HalDeposit.fromDb)
  }

  /** Mark that the user asked for an on-demand status refresh. */
  async requestRefresh(id: number, now: Date): Promise<void> {
    await this.prismaClient.halDeposit.update({
      where: { id },
      data: { refreshRequestedAt: now },
    })
  }

  async clearRefreshRequest(id: number): Promise<void> {
    await this.prismaClient.halDeposit.update({
      where: { id },
      data: { refreshRequestedAt: null },
    })
  }

  /** Persist a successful SWORD submission and reset retry bookkeeping. */
  async updateAfterDeposit(
    id: number,
    result: DepositResultUpdate,
  ): Promise<HalDeposit> {
    await this.prismaClient.halDeposit.update({
      where: { id },
      data: {
        halId: result.halId,
        halPassword: result.halPassword,
        halVersion: result.halVersion,
        halUrl: result.halUrl,
        status: result.status,
        retryCount: 0,
        nextRetryAt: null,
        lastError: null,
      },
    })
    return this.requireById(id)
  }

  /** Record a retryable failure: bump retry count, schedule backoff, return to `pending`. */
  async registerFailure(
    id: number,
    retryCount: number,
    nextRetryAt: Date,
    lastError: string,
  ): Promise<void> {
    await this.prismaClient.halDeposit.update({
      where: { id },
      data: {
        status: HalDepositStatus.pending,
        startedAt: null,
        retryCount,
        nextRetryAt,
        lastError,
      },
    })
  }

  /** Record a terminal (non-retryable) failure. */
  async markError(id: number, lastError: string): Promise<void> {
    await this.prismaClient.halDeposit.update({
      where: { id },
      data: {
        status: HalDepositStatus.error,
        startedAt: null,
        nextRetryAt: null,
        lastError,
      },
    })
  }

  /** Apply a status pulled from the HAL status endpoint (verify polling / refresh). */
  async updateStatusFromHal(
    id: number,
    status: HalDepositStatus,
    comment: string | null,
  ): Promise<HalDeposit> {
    await this.prismaClient.halDeposit.update({
      where: { id },
      data: { status, comment },
    })
    return this.requireById(id)
  }
}
