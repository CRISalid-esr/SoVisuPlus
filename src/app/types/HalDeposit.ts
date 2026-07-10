import {
  HalDepositStatus,
  HalDepositFile as DbHalDepositFile,
} from '@prisma/client'
import { HalDepositWithRelations as DbHalDeposit } from '@/prisma-schema/extended-client'

export { HalDepositStatus }

interface HalDepositFileJson {
  id: number
  fileName: string
  filePath: string
  isMain: boolean
  mimeType: string
  fileSource: string
  fileType: string
  visibility: string
  license: string | null
}

class HalDepositFile {
  constructor(
    public id: number,
    public fileName: string,
    public filePath: string,
    public isMain: boolean,
    public mimeType: string,
    public fileSource: string,
    public fileType: string,
    public visibility: string,
    public license: string | null,
  ) {}

  static fromDb(db: DbHalDepositFile): HalDepositFile {
    return new HalDepositFile(
      db.id,
      db.fileName,
      db.filePath,
      db.isMain,
      db.mimeType,
      db.fileSource,
      db.fileType,
      db.visibility,
      db.license,
    )
  }

  toJson(): HalDepositFileJson {
    return {
      id: this.id,
      fileName: this.fileName,
      filePath: this.filePath,
      isMain: this.isMain,
      mimeType: this.mimeType,
      fileSource: this.fileSource,
      fileType: this.fileType,
      visibility: this.visibility,
      license: this.license,
    }
  }
}

interface HalDepositJson {
  id: number
  documentUid: string
  personUid: string
  status: HalDepositStatus
  halId: string | null
  halVersion: number | null
  halUrl: string | null
  startedAt: string | null
  retryCount: number
  nextRetryAt: string | null
  lastError: string | null
  comment: string | null
  refreshRequestedAt: string | null
  halDocumentType: string
  halDomains: string[]
  language: string
  conferenceTitle: string | null
  conferenceCity: string | null
  conferenceStartDate: string | null
  conferenceCountry: string | null
  institution: string | null
  bookTitle: string | null
  supervisor: string | null
  files: HalDepositFileJson[]
  createdAt: string
  updatedAt: string
}

class HalDeposit {
  constructor(
    public id: number,
    public documentUid: string,
    public personUid: string,
    public status: HalDepositStatus,
    public halId: string | null,
    public halPassword: string | null,
    public halVersion: number | null,
    public halUrl: string | null,
    public startedAt: Date | null,
    public retryCount: number,
    public nextRetryAt: Date | null,
    public lastError: string | null,
    public comment: string | null,
    public refreshRequestedAt: Date | null,
    public halDocumentType: string,
    public halDomains: string[],
    public language: string,
    public conferenceTitle: string | null,
    public conferenceCity: string | null,
    public conferenceStartDate: string | null,
    public conferenceCountry: string | null,
    public institution: string | null,
    public bookTitle: string | null,
    public supervisor: string | null,
    public files: HalDepositFile[],
    public createdAt: Date,
    public updatedAt: Date,
  ) {}

  static fromDb(db: DbHalDeposit): HalDeposit {
    return new HalDeposit(
      db.id,
      db.document.uid,
      db.person.uid,
      db.status,
      db.halId,
      db.halPassword,
      db.halVersion,
      db.halUrl,
      db.startedAt,
      db.retryCount,
      db.nextRetryAt,
      db.lastError,
      db.comment,
      db.refreshRequestedAt,
      db.halDocumentType,
      db.halDomains,
      db.language,
      db.conferenceTitle,
      db.conferenceCity,
      db.conferenceStartDate,
      db.conferenceCountry,
      db.institution,
      db.bookTitle,
      db.supervisor,
      (db.files ?? []).map((f) => HalDepositFile.fromDb(f)),
      db.createdAt,
      db.updatedAt,
    )
  }

  /**
   * Client-facing serialization. `halPassword` is intentionally omitted — it is a
   * SWORD secret needed only server-side for a future PUT and must never reach the client.
   */
  toJson(): HalDepositJson {
    return {
      id: this.id,
      documentUid: this.documentUid,
      personUid: this.personUid,
      status: this.status,
      halId: this.halId,
      halVersion: this.halVersion,
      halUrl: this.halUrl,
      startedAt: this.startedAt?.toISOString() ?? null,
      retryCount: this.retryCount,
      nextRetryAt: this.nextRetryAt?.toISOString() ?? null,
      lastError: this.lastError,
      comment: this.comment,
      refreshRequestedAt: this.refreshRequestedAt?.toISOString() ?? null,
      halDocumentType: this.halDocumentType,
      halDomains: this.halDomains,
      language: this.language,
      conferenceTitle: this.conferenceTitle,
      conferenceCity: this.conferenceCity,
      conferenceStartDate: this.conferenceStartDate,
      conferenceCountry: this.conferenceCountry,
      institution: this.institution,
      bookTitle: this.bookTitle,
      supervisor: this.supervisor,
      files: this.files.map((f) => f.toJson()),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    }
  }
}

export { HalDeposit, HalDepositFile }
export type { HalDepositJson, HalDepositFileJson }
