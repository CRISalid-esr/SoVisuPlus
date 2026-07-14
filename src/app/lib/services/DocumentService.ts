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
import dayjs from 'dayjs'
import { OAStatus } from '@prisma/client'
import { Literal, LiteralJson } from '@/types/Literal'
import { ContributionActionParameters } from '@/types/ContributionAction'
import { InputJsonValue } from '@prisma/client/runtime/library'

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

interface CountDocumentsParams {
  searchTerm: string
  searchLang: string
  columnFilters: ColumnFilter[]
  contributorUid: string | null
  contributorType: AgentType
  halCollectionCodes: string[]
}

export class DocumentService {
  private documentDAO: DocumentDAO
  private personDAO: PersonDAO
  private actionDAO: ActionDAO
  private userDAO: UserDAO
  private conceptDAO: ConceptDAO
  private halDepositDAO: HalDepositDAO

  constructor() {
    this.documentDAO = new DocumentDAO()
    this.personDAO = new PersonDAO()
    this.actionDAO = new ActionDAO()
    this.userDAO = new UserDAO()
    this.conceptDAO = new ConceptDAO()
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

      await this.actionDAO.createAction({
        actionType: ActionType.UPDATE,
        targetType: ActionTargetType.DOCUMENT,
        targetUid: documentUid,
        path: 'contributions',
        parameters: { contributions } as unknown as InputJsonValue,
        personUid: user.person.uid,
      })

      // Flag the document as awaiting the graph round-trip. This freezes the
      // Authors tab (and disables further mutations) until the graph re-writes
      // the document, which resets the state back to `default`.
      await this.documentDAO.markDocumentsWaitingForUpdate([documentUid])
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
        // Direct-membership expansion. Hierarchical roll-up (institution →
        // member units → people) is deferred to the tree-navigation issue.
        contributorUids = (
          contributorUid
            ? await this.personDAO.fetchPeopleByOrganizationUid(contributorUid)
            : []
        ).map((person) => person.uid)
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

  async documentsPerYear(contributorUid: string, contributorType: AgentType) {
    const contributorUids = await this.buildContributorUidArray(
      contributorUid,
      contributorType,
    )
    try {
      const { documents } =
        await this.documentDAO.fetchOAYearDocuments(contributorUids)
      const publicationsPerYear = documents.reduce<
        Record<
          number,
          {
            uid: string
            oaStatus: OAStatus | null
            publicationDate: string | null
            upwOAStatus: OAStatus | null
            contributions: {
              person: {
                uid: string
                displayName: string | null
                memberships: {
                  organizationUnit: {
                    uid: string
                  }
                }[]
              }
              affiliations: {
                uid: string
                displayNames: string[]
                places: {
                  latitude: number
                  longitude: number
                }[]
              }[]
            }[]
          }[]
        >
      >((acc, doc) => {
        const publicationDate = doc.publicationDate
        if (publicationDate) {
          const parsedDate = dayjs(publicationDate)
          if (parsedDate.isValid()) {
            const year = parsedDate.year()
            acc[year] ??= []
            acc[year].push(doc)
          }
        }
        return acc
      }, {})
      return { publicationsPerYear }
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
  }: CountDocumentsParams) {
    const contributorUids = await this.buildContributorUidArray(
      contributorUid,
      contributorType,
    )

    if (contributorUids.length == 0) {
      return { allItems: 0, incompleteHalRepositoryItems: 0 }
    }

    const expandedColumnFilters = this.expandedColumnFilters(columnFilters)

    try {
      const { allItems, incompleteHalRepositoryItems } =
        await this.documentDAO.countDocuments({
          searchTerm,
          searchLang: searchLang,
          columnFilters: expandedColumnFilters,
          contributorUids,
          halCollectionCodes,
        })
      return { allItems, incompleteHalRepositoryItems }
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
      await this.documentDAO.deleteConceptsFromDocument(
        documentUid,
        conceptUids,
      )

      await this.actionDAO.createAction({
        actionType: ActionType.REMOVE,
        targetType: ActionTargetType.DOCUMENT,
        targetUid: documentUid,
        path: 'subjects',
        parameters: { conceptUids },
        personUid: user.person?.uid,
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
      await Promise.all(
        concepts.map((concept) =>
          this.conceptDAO.createOrUpdateConcept(Concept.fromObject(concept)),
        ),
      )
      await this.documentDAO.addConceptsToDocument(documentUid, concepts)

      await Promise.all(
        concepts.map((concept) =>
          this.actionDAO.createAction({
            actionType: ActionType.ADD,
            targetType: ActionTargetType.DOCUMENT,
            targetUid: documentUid,
            path: 'subjects',
            parameters: JSON.stringify(concept),
            personUid: user.person?.uid || '',
          }),
        ),
      )
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

      const oldTitles = document.titles
      const convertedTitles = titles.map((title) => Literal.fromObject(title))

      await this.documentDAO.modifyTitles(document.uid, convertedTitles)

      await Promise.all(
        oldTitles.map((title) =>
          this.actionDAO.createAction({
            actionType: ActionType.REMOVE,
            targetType: ActionTargetType.DOCUMENT,
            targetUid: document.uid,
            path: 'titles',
            parameters: JSON.stringify(title),
            personUid: user.person?.uid || '',
          }),
        ),
      )

      await Promise.all(
        convertedTitles.map((title) =>
          this.actionDAO.createAction({
            actionType: ActionType.ADD,
            targetType: ActionTargetType.DOCUMENT,
            targetUid: document.uid,
            path: 'titles',
            parameters: JSON.stringify(title),
            personUid: user.person?.uid || '',
          }),
        ),
      )
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

      const oldAbstracts = document.abstracts
      const convertedAbstracts = abstracts.map((abstract) =>
        Literal.fromObject(abstract),
      )

      await this.documentDAO.modifyAbstracts(document.uid, convertedAbstracts)

      await Promise.all(
        oldAbstracts.map((abstract) =>
          this.actionDAO.createAction({
            actionType: ActionType.REMOVE,
            targetType: ActionTargetType.DOCUMENT,
            targetUid: document.uid,
            path: 'abstracts',
            parameters: JSON.stringify(abstract),
            personUid: user.person?.uid || '',
          }),
        ),
      )

      await Promise.all(
        convertedAbstracts.map((abstract) =>
          this.actionDAO.createAction({
            actionType: ActionType.ADD,
            targetType: ActionTargetType.DOCUMENT,
            targetUid: document.uid,
            path: 'abstracts',
            parameters: JSON.stringify(abstract),
            personUid: user.person?.uid || '',
          }),
        ),
      )
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

      const updated =
        await this.documentDAO.markDocumentsWaitingForUpdate(documentUids)

      await this.actionDAO.createAction({
        actionType: ActionType.MERGE,
        targetType: ActionTargetType.DOCUMENT,
        // for now, the primary document is elected by graph algorithm,
        // not by user choice, thus the targetUid is simply the first in the list
        // without any special meaning. The other merged documents are in parameters.
        targetUid: documentUids[0],
        path: null,
        parameters: { mergedDocumentUids: documentUids.slice(1) },
        personUid: user.person?.uid,
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

      await this.documentDAO.updateDocumentTypeByUid(documentUid, documentType)

      await this.actionDAO.createAction({
        actionType: ActionType.UPDATE,
        targetType: ActionTargetType.DOCUMENT,
        targetUid: documentUid,
        path: 'documentType',
        parameters: { value: documentType },
        personUid: user.person.uid,
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

      await this.documentDAO.updatePublicationDateByUid(
        documentUid,
        publicationDate,
      )

      await this.actionDAO.createAction({
        actionType: ActionType.UPDATE,
        targetType: ActionTargetType.DOCUMENT,
        targetUid: documentUid,
        path: 'publicationDate',
        parameters: { value: publicationDate },
        personUid: user.person.uid,
      })
    } catch (error) {
      const message = 'Error updating publication date'
      console.error(message, error)
      throw new Error(message)
    }
  }
}
