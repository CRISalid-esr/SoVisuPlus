import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { AgentType } from '@/types/IAgent'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { ActionDAO } from '@/lib/daos/ActionDAO'
import { ActionTargetType, ActionType } from '@/types/Action'
import { UserDAO } from '@/lib/daos/UserDAO'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

interface FetchDocumentsParams {
  searchTerm: string
  searchLang: string
  page: number
  pageSize: number
  columnFilters: { id: string; value: string }[]
  sorting: { id: string; desc: boolean }[]
  contributorUid: string | null
  contributorType: AgentType
  halCollectionCodes: string[]
  areHalCollectionCodesOmitted: boolean
}

interface CountDocumentsParams {
  searchTerm: string
  searchLang: string
  columnFilters: { id: string; value: string }[]
  contributorUid: string | null
  contributorType: AgentType
  halCollectionCodes: string[]
}

export class DocumentService {
  private documentDAO: DocumentDAO
  private personDAO: PersonDAO
  private actionDAO: ActionDAO
  private userDAO: UserDAO

  constructor() {
    this.documentDAO = new DocumentDAO()
    this.personDAO = new PersonDAO()
    this.actionDAO = new ActionDAO()
    this.userDAO = new UserDAO()
  }

  async selectContributorUids(
    contributorUid: string | null,
    contributorType: AgentType,
  ) {
    let contributorUids: string[] = []
    switch (contributorType) {
      case 'person':
        contributorUids = contributorUid ? [contributorUid] : []
        break
      case 'research_structure':
        contributorUids = (
          contributorUid
            ? await this.personDAO.fetchPeopleByResearchStructureUid(
                contributorUid,
              )
            : []
        ).map((person) => person.uid)
        break
      case 'institution':
        console.error('Institution filter not implemented yet')
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
    const contributorUids = await this.selectContributorUids(
      contributorUid,
      contributorType,
    )

    try {
      const { documents, totalItems } = await this.documentDAO.fetchDocuments({
        searchTerm,
        searchLang: searchLang,
        page,
        pageSize,
        columnFilters,
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

  async countDocuments({
    searchTerm,
    searchLang,
    columnFilters,
    contributorUid,
    contributorType,
    halCollectionCodes,
  }: CountDocumentsParams) {
    const contributorUids = await this.selectContributorUids(
      contributorUid,
      contributorType,
    )

    try {
      const { allItems, incompleteHalRepositoryItems } =
        await this.documentDAO.countDocuments({
          searchTerm,
          searchLang: searchLang,
          columnFilters,
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
      const user = await this.userDAO.getUserByIdentifier({
        type: PersonIdentifierType.LOCAL,
        value: userName,
      })
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

  async mergeDocuments(documentUids: string[], userName: string) {
    if (documentUids.length < 2) {
      throw new Error('At least two documents are required to merge')
    }
    try {
      const user = await this.userDAO.getUserByIdentifier({
        type: PersonIdentifierType.LOCAL,
        value: userName,
      })
      if (!user?.person) {
        throw new Error(`User with username ${userName} not found`)
      }

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
    } catch (error) {
      const message = 'Error merging documents'
      console.error(message, error)
      throw new Error(message)
    }
  }
}
