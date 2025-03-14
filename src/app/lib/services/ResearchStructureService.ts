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
      console.error('Error fetching person by UID:', error)
      throw new Error('Error fetching person from service')
    }
  }
}
