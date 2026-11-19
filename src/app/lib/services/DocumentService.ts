import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { AgentType } from '@/types/IAgent'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { ActionDAO } from '@/lib/daos/ActionDAO'
import { ActionTargetType, ActionType } from '@/types/Action'
import { UserDAO } from '@/lib/daos/UserDAO'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { DocumentTypeService } from '@/lib/services/DocumentTypeService'
import { DocumentType, Document } from '@/types/Document'
import { Concept, ConceptJson } from '@/types/Concept'
import { ConceptDAO } from '@/lib/daos/ConceptDAO'
import {
  HalDepositDAO,
  CreateHalDepositParams,
  HalDepositFileInput,
} from '@/lib/daos/HalDepositDAO'
import { HalDeposit } from '@/types/HalDeposit'
import { Person } from '@/types/Person'
import { Literal, LiteralJson } from '@/types/Literal'
import { ContributionActionParameters } from '@/types/ContributionAction'
import { InputJsonValue } from '@prisma/client/runtime/library'
import { DashboardDocumentData } from '@/types/DashboardDocumentData'
import { runInTransaction } from '@/lib/daos/transaction'

type ColumnFilter =
  | { id: 'date'; value: [string | null, string | null] }
  | { id: string; value: string | string[] }

interface FetchDocumentsParams {
  searchTerm: string
  searchLang: string
  page: number
  pageSize: number
  columnFilters: ColumnFilter[]
  sorting: { id: string; desc: boolean }[]
  contributorUid: string | null
  contributorType: AgentType
  halCollectionCodes: string[]
  areHalCollectionCodesOmitted: boolean
}

// Mirrors FetchDocumentsParams minus paging and sorting.
interface CountDocumentsParams {
  searchTerm: string
  searchLang: string
  columnFilters: ColumnFilter[]
  contributorUid: string | null
  contributorType: AgentType
  halCollectionCodes: string[]
  areHalCollectionCodesOmitted: boolean
}

export class DocumentService {
  private documentDAO: DocumentDAO
  private personDAO: PersonDAO
  private userDAO: UserDAO
  private halDepositDAO: HalDepositDAO

  constructor() {
    this.documentDAO = new DocumentDAO()
    this.personDAO = new PersonDAO()
    this.userDAO = new UserDAO()
    this.halDepositDAO = new HalDepositDAO()
  }

  // ─── HAL deposits ─────────────────────────────────────────────────────────
  // The go-between for the deposit API routes and HalDepositDAO. Deposits are made on behalf
  // of the perspective person carried by the request, not the authenticated user.

  /** Fetch the perspective person (for the server-side authz + eligibility checks). */
  async getPersonByUid(uid: string): Promise<Person | null> {
    return this.personDAO.fetchPersonByUid(uid)
  }

  /** Create a deposit row in `pending` status (files are attached afterwards). */
  async createHalDeposit(params: CreateHalDepositParams): Promise<HalDeposit> {
    return this.halDepositDAO.createDeposit(params)
  }

  /** Attach uploaded files (already written to disk) to a deposit. */
  async attachDepositFiles(
    depositId: number,
    files: HalDepositFileInput[],
  ): Promise<HalDeposit> {
    return this.halDepositDAO.addFiles(depositId, files)
  }

  /** Remove a deposit (used to roll back when post-creation steps fail). */
  async deleteHalDeposit(depositId: number): Promise<void> {
    await this.halDepositDAO.deleteDeposit(depositId)
  }

  async getHalDepositById(depositId: number): Promise<HalDeposit | null> {
    return this.halDepositDAO.findById(depositId)
  }

  /** Latest deposit for a document (by updatedAt), used to render the status panel. */
  async getLatestDepositForDocument(
    documentUid: string,
  ): Promise<HalDeposit | null> {
    return this.halDepositDAO.findLatestByDocumentUid(documentUid)
  }

  /** Signal an on-demand status refresh for a deposit (listener picks it up). */
  async requestDepositRefresh(depositId: number): Promise<void> {
    await this.halDepositDAO.requestRefresh(depositId, new Date())
  }

  /**
   * Persist the contributions made on the Authors tab.
   *
   * Contribution data is intentionally NOT written to the app DB here. The save
   * becomes a single authoritative `Action` row (actionType UPDATE, targetType
   * DOCUMENT, path 'contributions') that the change poller forwards to the graph;
   * the updated data round-trips back via AMQP. The action carries the complete new
   * state of the document's contributions — contributors present are upserted,
   * contributors absent are removed.
   */
  async saveContributions(
    documentUid: string,
    contributions: ContributionActionParameters[],
    userName: string,
  ): Promise<void> {
    try {
      const user = await this.userDAO.getUserByIdentifier(
        new PersonIdentifier(PersonIdentifierType.local, userName),
      )
      if (!user?.person) {
        throw new Error(`User with username ${userName} not found`)
      }

      const personUid = user.person.uid
      await runInTransaction(async (tx) => {
        await new ActionDAO(tx).createAction({
          actionType: ActionType.UPDATE,
          targetType: ActionTargetType.DOCUMENT,
          targetUid: documentUid,
          path: 'contributions',
          parameters: { contributions } as unknown as InputJsonValue,
          personUid,
        })

        // Flag the document as awaiting the graph round-trip. This freezes the
        // Authors tab (and disables further mutations) until the graph re-writes
        // the document, which resets the state back to `default`.
        await new DocumentDAO(tx).markDocumentsWaitingForUpdate([documentUid])
      })
    } catch (error) {
      const message = 'Error saving contributions'
      console.error(message, error)
      throw new Error(message)
    }
  }

  async buildContributorUidArray(
    contributorUid: string | null,
    contributorType: AgentType,
  ) {
    let contributorUids: string[] = []
    switch (contributorType) {
      case 'person':
        contributorUids = contributorUid ? [contributorUid] : []
        break
      case 'institution':
      case 'research_unit':
      case 'other_structure':
      case 'team':
        // One-hop expansion through organization relationships; the
        // per-group perimeter rules live in the DAO.
        contributorUids = contributorUid
          ? await this.personDAO.fetchPersonUidsByOrganizationPerimeter(
              contributorUid,
              contributorType,
            )
          : []
        break
    }

    return contributorUids
  }

  async fetchDocuments({
    searchTerm,
    searchLang,
    page,
    pageSize,
    columnFilters,
    sorting,
    contributorUid,
    contributorType,
    halCollectionCodes,
    areHalCollectionCodesOmitted,
  }: FetchDocumentsParams) {
    const contributorUids = await this.buildContributorUidArray(
      contributorUid,
      contributorType,
    )

    if (contributorUids.length == 0) {
      return { documents: [], totalItems: 0 }
    }

    const expandedColumnFilters = this.expandedColumnFilters(columnFilters)

    try {
      const { documents, totalItems } = await this.documentDAO.fetchDocuments({
        searchTerm,
        searchLang: searchLang,
        page,
        pageSize,
        columnFilters: expandedColumnFilters,
        sorting,
        contributorUids,
        halCollectionCodes,
        areHalCollectionCodesOmitted,
      })
      return { documents, totalItems }
    } catch (error) {
      console.error('Error in service layer:', error)
      throw new Error('Error fetching documents from service')
    }
  }

  /** Oldest publication year of the perspective, to bound the dashboard year range. */
  async oldestPublicationYear(
    contributorUid: string,
    contributorType: AgentType,
  ): Promise<number | null> {
    const contributorUids = await this.buildContributorUidArray(
      contributorUid,
      contributorType,
    )
    return this.documentDAO.fetchOldestPublicationYear(contributorUids)
  }

  async documentsPerYear(
    contributorUid: string,
    contributorType: AgentType,
    fromYear: number,
    toYear: number,
  ) {
    const contributorUids = await this.buildContributorUidArray(
      contributorUid,
      contributorType,
    )
    try {
      const { documents } = await this.documentDAO.fetchOAYearDocuments(
        contributorUids,
        fromYear,
        toYear,
      )
      const publicationsPerYear = documents.reduce<
        Record<number, DashboardDocumentData[]>
      >((acc, { year, ...doc }) => {
        acc[year] ??= []
        acc[year].push(doc)
        return acc
      }, {})
      // The perimeter is what separates the perspective's own contributors from
      // its collaborators; the client cannot derive it (the rules are one-hop
      // expansions living in PersonDAO), so it travels with the documents.
      return { publicationsPerYear, perimeterUids: contributorUids }
    } catch (error) {
      console.error('Error in service layer:', error)
      throw new Error('Error fetching documents from service')
    }
  }

  private expandedColumnFilters(columnFilters: ColumnFilter[]) {
    return columnFilters.map((f) => {
      if (f.id !== 'type' || !Array.isArray(f.value)) return f
      const validTypes = (f.value as unknown[]).filter(
        DocumentTypeService.isDocumentType,
      ) // ✅ type-safe guard

      const expanded = DocumentTypeService.expandTypes(validTypes)
      return { ...f, value: expanded }
    })
  }

  async countDocuments({
    searchTerm,
    searchLang,
    columnFilters,
    contributorUid,
    contributorType,
    halCollectionCodes,
    areHalCollectionCodesOmitted,
  }: CountDocumentsParams): Promise<number> {
    const contributorUids = await this.buildContributorUidArray(
      contributorUid,
      contributorType,
    )

    if (contributorUids.length == 0) {
      return 0
    }

    try {
      return await this.documentDAO.countDocuments({
        searchTerm,
        searchLang,
        columnFilters: this.expandedColumnFilters(columnFilters),
        contributorUids,
        halCollectionCodes,
        areHalCollectionCodesOmitted,
      })
    } catch (error) {
      console.error('Error in service layer:', error)
      throw new Error('Error counting documents from service')
    }
  }

  async fetchDocumentById(uid: string) {
    try {
      return await this.documentDAO.fetchDocumentById(uid)
    } catch (error) {
      console.error('Error in service layer:', error)
      throw new Error('Error fetching document from service')
    }
  }

  async deleteConceptsFromDocument(
    documentUid: string,
    conceptUids: string[],
    userName: string,
  ): Promise<void> {
    try {
      const user = await this.userDAO.getUserByIdentifier(
        new PersonIdentifier(PersonIdentifierType.local, userName),
      )
      if (!user?.person) {
        throw new Error(`User with username ${userName} not found`)
      }
      const personUid = user.person.uid
      await runInTransaction(async (tx) => {
        await new DocumentDAO(tx).deleteConceptsFromDocument(
          documentUid,
          conceptUids,
        )
        await new ActionDAO(tx).createAction({
          actionType: ActionType.REMOVE,
          targetType: ActionTargetType.DOCUMENT,
          targetUid: documentUid,
          path: 'subjects',
          parameters: { conceptUids },
          personUid,
        })
      })
    } catch (error) {
      const message = 'Error deleting concepts from document'
      console.error(message, error)
      throw new Error(message)
    }
  }

  async addConceptsToDocument(
    documentUid: string,
    concepts: ConceptJson[],
    userName: string,
  ): Promise<void> {
    try {
      const user = await this.userDAO.getUserByIdentifier(
        new PersonIdentifier(PersonIdentifierType.local, userName),
      )
      if (!user?.person) {
        throw new Error(`User with username ${userName} not found`)
      }
      const personUid = user.person.uid
      await runInTransaction(async (tx) => {
        const conceptDAO = new ConceptDAO(tx)
        for (const concept of concepts) {
          await conceptDAO.createOrUpdateConcept(Concept.fromObject(concept))
        }
        await new DocumentDAO(tx).addConceptsToDocument(documentUid, concepts)
        await new ActionDAO(tx).createActions(
          concepts.map((concept) => ({
            actionType: ActionType.ADD,
            targetType: ActionTargetType.DOCUMENT,
            targetUid: documentUid,
            path: 'subjects',
            parameters: JSON.stringify(concept),
            personUid,
          })),
        )
      })
    } catch (error) {
      const message = 'Error adding concepts to document'
      console.error(message, error)
      throw new Error(message)
    }
  }

  async modifyTitles(
    document: Document,
    titles: LiteralJson[],
    userName: string,
  ): Promise<void> {
    try {
      const user = await this.userDAO.getUserByIdentifier(
        new PersonIdentifier(PersonIdentifierType.local, userName),
      )
      if (!user?.person) {
        throw new Error(`User with username ${userName} not found`)
      }

      const personUid = user.person.uid
      const convertedTitles = titles.map((title) => Literal.fromObject(title))

      await runInTransaction(async (tx) => {
        // The REMOVE actions announce the titles actually replaced, read in the
        // transaction, not those the caller read before
        const replaced = await new DocumentDAO(tx).modifyTitles(
          document.uid,
          convertedTitles,
        )
        const titleAction = (actionType: ActionType, title: Literal) => ({
          actionType,
          targetType: ActionTargetType.DOCUMENT,
          targetUid: document.uid,
          path: 'titles',
          parameters: JSON.stringify(title),
          personUid,
        })
        await new ActionDAO(tx).createActions([
          ...replaced.map((title) => titleAction(ActionType.REMOVE, title)),
          ...convertedTitles.map((title) => titleAction(ActionType.ADD, title)),
        ])
      })
    } catch (error) {
      const message = 'Error modifying titles of document'
      console.error(message, error)
      throw new Error(message)
    }
  }

  async modifyAbstracts(
    document: Document,
    abstracts: LiteralJson[],
    userName: string,
  ): Promise<void> {
    try {
      const user = await this.userDAO.getUserByIdentifier(
        new PersonIdentifier(PersonIdentifierType.local, userName),
      )
      if (!user?.person) {
        throw new Error(`User with username ${userName} not found`)
      }

      const personUid = user.person.uid
      const convertedAbstracts = abstracts.map((abstract) =>
        Literal.fromObject(abstract),
      )

      await runInTransaction(async (tx) => {
        // The REMOVE actions announce the abstracts actually replaced, read in
        // the transaction, not those the caller read before
        const replaced = await new DocumentDAO(tx).modifyAbstracts(
          document.uid,
          convertedAbstracts,
        )
        const abstractAction = (actionType: ActionType, abstract: Literal) => ({
          actionType,
          targetType: ActionTargetType.DOCUMENT,
          targetUid: document.uid,
          path: 'abstracts',
          parameters: JSON.stringify(abstract),
          personUid,
        })
        await new ActionDAO(tx).createActions([
          ...replaced.map((abstract) =>
            abstractAction(ActionType.REMOVE, abstract),
          ),
          ...convertedAbstracts.map((abstract) =>
            abstractAction(ActionType.ADD, abstract),
          ),
        ])
      })
    } catch (error) {
      const message = 'Error modifying abstracts of document'
      console.error(message, error)
      throw new Error(message)
    }
  }

  async mergeDocuments(documentUids: string[], userName: string) {
    if (documentUids.length < 2) {
      throw new Error('At least two documents are required to merge')
    }
    try {
      const user = await this.userDAO.getUserByIdentifier(
        new PersonIdentifier(PersonIdentifierType.local, userName),
      )
      if (!user?.person) {
        throw new Error(`User with username ${userName} not found`)
      }

      const personUid = user.person.uid
      const updated = await runInTransaction(async (tx) => {
        const updated = await new DocumentDAO(tx).markDocumentsWaitingForUpdate(
          documentUids,
        )

        await new ActionDAO(tx).createAction({
          actionType: ActionType.MERGE,
          targetType: ActionTargetType.DOCUMENT,
          // for now, the primary document is elected by graph algorithm,
          // not by user choice, thus the targetUid is simply the first in the list
          // without any special meaning. The other merged documents are in parameters.
          targetUid: documentUids[0],
          path: null,
          parameters: { mergedDocumentUids: documentUids.slice(1) },
          personUid,
        })
        return updated
      })

      return { updated }
    } catch (error) {
      const message = 'Error merging documents'
      console.error(message, error)
      throw new Error(message)
    }
  }

  async updateDocumentType(
    documentUid: string,
    documentType: DocumentType,
    userName: string,
  ): Promise<void> {
    try {
      const user = await this.userDAO.getUserByIdentifier(
        new PersonIdentifier(PersonIdentifierType.local, userName),
      )
      if (!user?.person) {
        throw new Error(`User with username ${userName} not found`)
      }

      const personUid = user.person.uid
      await runInTransaction(async (tx) => {
        await new DocumentDAO(tx).updateDocumentTypeByUid(
          documentUid,
          documentType,
        )
        await new ActionDAO(tx).createAction({
          actionType: ActionType.UPDATE,
          targetType: ActionTargetType.DOCUMENT,
          targetUid: documentUid,
          path: 'documentType',
          parameters: { value: documentType },
          personUid,
        })
      })
    } catch (error) {
      const message = 'Error updating document type'
      console.error(message, error)
      throw new Error(message)
    }
  }

  async updatePublicationDate(
    documentUid: string,
    publicationDate: string | null,
    userName: string,
  ): Promise<void> {
    try {
      const user = await this.userDAO.getUserByIdentifier(
        new PersonIdentifier(PersonIdentifierType.local, userName),
      )
      if (!user?.person) {
        throw new Error(`User with username ${userName} not found`)
      }

      const personUid = user.person.uid
      await runInTransaction(async (tx) => {
        await new DocumentDAO(tx).updatePublicationDateByUid(
          documentUid,
          publicationDate,
        )
        await new ActionDAO(tx).createAction({
          actionType: ActionType.UPDATE,
          targetType: ActionTargetType.DOCUMENT,
          targetUid: documentUid,
          path: 'publicationDate',
          parameters: { value: publicationDate },
          personUid,
        })
      })
    } catch (error) {
      const message = 'Error updating publication date'
      console.error(message, error)
      throw new Error(message)
    }
  }
}
