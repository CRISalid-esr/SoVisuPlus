import { ResearchStructureDAO } from '@/lib/daos/ResearchStructureDAO'
import { ResearchStructure } from '@/types/ResearchStructure'

export class ResearchStructureService {
  private researchStructureDAO: ResearchStructureDAO

  constructor() {
    this.researchStructureDAO = new ResearchStructureDAO()
  }

  async fetchResearchStructureBySlug(
    slug: string,
  ): Promise<ResearchStructure | null> {
    try {
      const researchStructure =
        await this.researchStructureDAO.fetchResearchStructureBySlug(slug)
      if (!researchStructure) {
        throw new Error(`ResearchStructure with slug ${slug} not found`)
      }
      return researchStructure
    } catch (error) {
      console.error('Error fetching research structure by slug:', error)
      throw new Error('Error fetching research structure from service')
    }
  }

  /**
   * Get a list of research structures
   * @param searchTerm
   * @param pageNumber
   * @param itemsPerPage
   * @returns A list of research structures and the total number of results
   */
  async getResearchStructures({
    searchTerm,
    pageNumber,
    itemsPerPage,
  }: {
    searchTerm: string
    pageNumber: number
    itemsPerPage: number
  }): Promise<{ researchStructures: ResearchStructure[]; total: number }> {
    try {
      const researchStructures =
        await this.researchStructureDAO.getResearchStructures(
          searchTerm,
          pageNumber,
          itemsPerPage,
        )

      const total =
        await this.researchStructureDAO.countResearchStructures(searchTerm)

      return { researchStructures, total }
    } catch (error) {
      console.error('Error fetching research structures:', error)
      throw new Error('Error fetching research structures from service')
    }
  }
}
