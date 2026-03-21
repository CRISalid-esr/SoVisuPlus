import { ResearchUnitDAO } from '@/lib/daos/ResearchUnitDAO'
import { ResearchUnit } from '@/types/ResearchUnit'

export class ResearchUnitService {
  private researchUnitDAO: ResearchUnitDAO

  constructor() {
    this.researchUnitDAO = new ResearchUnitDAO()
  }

  async fetchResearchUnitBySlug(slug: string): Promise<ResearchUnit | null> {
    try {
      const researchUnit =
        await this.researchUnitDAO.fetchResearchUnitBySlug(slug)
      if (!researchUnit) {
        throw new Error(`ResearchUnit with slug ${slug} not found`)
      }
      return researchUnit
    } catch (error) {
      console.error('Error fetching research unit by slug:', error)
      throw new Error('Error fetching research unit from service')
    }
  }

  /**
   * Get a list of research units
   * @param searchTerm
   * @param pageNumber
   * @param itemsPerPage
   * @returns A list of research units and the total number of results
   */
  async getResearchUnits({
    searchTerm,
    pageNumber,
    itemsPerPage,
  }: {
    searchTerm: string
    pageNumber: number
    itemsPerPage: number
  }): Promise<{ researchUnits: ResearchUnit[]; total: number }> {
    try {
      const researchUnits = await this.researchUnitDAO.getResearchUnits(
        searchTerm,
        pageNumber,
        itemsPerPage,
      )

      const total = await this.researchUnitDAO.countResearchUnits(searchTerm)

      return { researchUnits: researchUnits, total }
    } catch (error) {
      console.error('Error fetching research units:', error)
      throw new Error('Error fetching research units from service')
    }
  }
}
