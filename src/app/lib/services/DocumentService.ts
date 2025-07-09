import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { AgentType } from '@/types/IAgent'
import { PersonDAO } from '@/lib/daos/PersonDAO'

interface FetchDocumentsParams {
  searchTerm: string
  searchLang: string
  page: number
  pageSize: number
  columnFilters: { id: string; value: string }[]
  sorting: { id: string; desc: boolean }[]
  contributorUid: string | null
  contributorType: AgentType
  omittedHalCollectionCodes: string[]
}

interface CountDocumentsParams {
  searchTerm: string
  searchLang: string
  columnFilters: { id: string; value: string }[]
  contributorUid: string | null
  contributorType: AgentType
  omittedHalCollectionCodes: string[]
}

export class DocumentService {
  private documentDAO: DocumentDAO
  private personDAO: PersonDAO

  constructor() {
    this.documentDAO = new DocumentDAO()
    this.personDAO = new PersonDAO()
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
    omittedHalCollectionCodes,
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
        omittedHalCollectionCodes,
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
    omittedHalCollectionCodes,
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
          omittedHalCollectionCodes,
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
}
