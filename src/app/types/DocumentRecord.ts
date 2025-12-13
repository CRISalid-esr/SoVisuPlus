import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
  getBibliographicPlatformFromDbValue,
} from '@/types/BibliographicPlatform'
import { Literal } from '@/types/Literal'
import { IAgent } from '@/types/IAgent'
import { Person } from '@/types/Person'
import { ResearchStructure } from '@/types/ResearchStructure'
import { getStringInLocale } from '@/utils/getStringInLocale'
import { DocumentType, HalSubmitType as DbHalSubmitType } from '@prisma/client'
import { DocumentRecordWithRelations as DbDocumentRecord } from '@/prisma-schema/extended-client'
import {
  SourceContribution,
  SourceContributionJson,
} from '@/types/SourceContribution'
import { SourceJournal, SourceJournalJson } from '@/types/SourceJournal'
import { Document } from '@/types/Document'

export interface DocumentRecordJson {
  uid: string
  contributions: Array<SourceContributionJson>
  documentTypes: string[]
  publicationDate: Date | null
  platform: BibliographicPlatform
  titles: Array<Literal>
  _url: string | null
  halCollectionCodes: string[]
  halSubmitType: DbHalSubmitType | null
  journal?: SourceJournalJson
}

export class DocumentRecord {
  private _url: URL | null = null

  constructor(
    public uid: string,
    public contributions: Array<SourceContribution> = [],
    public documentTypes: DocumentType[],
    public publicationDate: Date | null,
    public platform: BibliographicPlatform,
    public titles: Array<Literal>,
    url?: string | null,
    public halCollectionCodes: string[] = [],
    public halSubmitType: DbHalSubmitType | null = null,
    public journal?: SourceJournal,
  ) {
    if (url) this.setUrl(url)
  }

  getTitleInLocale(localeNumber: number): string {
    return getStringInLocale(this.titles, localeNumber)
  }

  getPlatformName(): string {
    return BibliographicPlatformMetadata[this.platform]?.name || 'Unknown'
  }

  getPlatformIcon(): string {
    return (
      BibliographicPlatformMetadata[this.platform]?.icon || '/icons/default.png'
    )
  }

  get url(): string | null {
    return this._url ? this._url.toString() : null
  }

  set url(value: string | null) {
    if (value === null) {
      this._url = null
      return
    }
    this.setUrl(value)
  }

  isResearchStructureInCollectionCodes(perspective: IAgent | null): boolean {
    if (!perspective) {
      return false
    }

    switch (perspective.type) {
      case 'person': {
        const { memberships } = perspective as Person

        return memberships
          .map(({ researchStructure: { acronym } }) => acronym)
          .some((acronym) =>
            acronym ? this.halCollectionCodes.includes(acronym) : false,
          )
      }
      case 'research_structure': {
        const { acronym } = perspective as ResearchStructure

        return acronym ? this.halCollectionCodes.includes(acronym) : false
      }
      case 'institution':
      default:
        return false
    }
  }

  private setUrl(value: string) {
    try {
      this._url = new URL(value)
    } catch (error: unknown) {
      throw new Error(
        `Invalid URL: ${value} - ${(error as Error | undefined)?.message}`,
      )
    }
  }

  static fromObject(record: DocumentRecordJson): DocumentRecord {
    return new DocumentRecord(
      record.uid,
      record.contributions.map((contribution: SourceContributionJson) =>
        SourceContribution.fromObject(contribution),
      ),
      record.documentTypes.map((type: string) =>
        Document.documentTypeFromString(type),
      ),
      record.publicationDate,
      record.platform,
      record.titles.map((title) => Literal.fromObject(title)),
      record._url,
      record.halCollectionCodes,
      record.halSubmitType,
      record.journal ? SourceJournal.fromJson(record.journal) : undefined,
    )
  }

  static fromDbDocumentRecord(record: DbDocumentRecord) {
    return new DocumentRecord(
      record.uid,
      record.contributions.map((contribution) =>
        SourceContribution.fromDbContribution(contribution),
      ),
      record.documentTypes,
      record.publicationDate,
      getBibliographicPlatformFromDbValue(record.platform),
      (record.titles as { value: string; language: string }[]).map(
        (title: { value: string; language: string }) =>
          Literal.fromObject(title),
      ),
      record.url,
      record.halCollectionCodes,
      record.halSubmitType,
      record.journal
        ? SourceJournal.fromDbSourceJournal(record.journal)
        : undefined,
    )
  }
}
