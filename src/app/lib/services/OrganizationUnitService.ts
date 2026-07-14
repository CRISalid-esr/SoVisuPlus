import {
  OrganizationGroup,
  OrganizationUnitDAO,
} from '@/lib/daos/OrganizationUnitDAO'
import { OrganizationUnit } from '@/types/OrganizationUnit'

export class OrganizationUnitService {
  private organizationUnitDAO: OrganizationUnitDAO

  constructor() {
    this.organizationUnitDAO = new OrganizationUnitDAO()
  }

  async fetchOrganizationUnitBySlug(
    slug: string,
  ): Promise<OrganizationUnit | null> {
    try {
      const organizationUnit =
        await this.organizationUnitDAO.fetchOrganizationUnitBySlug(slug)
      if (!organizationUnit) {
        throw new Error(`OrganizationUnit with slug ${slug} not found`)
      }
      return organizationUnit
    } catch (error) {
      console.error('Error fetching organization unit by slug:', error)
      throw new Error('Error fetching organization unit from service')
    }
  }

  /**
   * Get a list of organization units of a perspective group
   * @param searchTerm
   * @param group
   * @param pageNumber
   * @param itemsPerPage
   * @returns A list of organization units and the total number of results
   */
  async getOrganizationUnits({
    searchTerm,
    group,
    pageNumber,
    itemsPerPage,
  }: {
    searchTerm: string
    group: OrganizationGroup
    pageNumber: number
    itemsPerPage: number
  }): Promise<{ organizations: OrganizationUnit[]; total: number }> {
    try {
      const organizations = await this.organizationUnitDAO.getOrganizationUnits(
        searchTerm,
        group,
        pageNumber,
        itemsPerPage,
      )

      const total = await this.organizationUnitDAO.countOrganizationUnits(
        searchTerm,
        group,
      )

      return { organizations, total }
    } catch (error) {
      console.error('Error fetching organization units:', error)
      throw new Error('Error fetching organization units from service')
    }
  }
}
