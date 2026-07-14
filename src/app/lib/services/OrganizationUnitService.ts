import {
  OrganizationGroup,
  OrganizationUnitDAO,
} from '@/lib/daos/OrganizationUnitDAO'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { OrganizationDirectoryEntry } from '@/types/OrganizationDirectory'
import { Literal } from '@/types/Literal'
import {
  OAStatus,
  OrganizationCategory,
  OrganizationRelationKind,
} from '@prisma/client'

/** Every OA colour counts as open access; CLOSED / OTHER / unknown do not. */
const OPEN_ACCESS_STATUSES: OAStatus[] = [
  OAStatus.GREEN,
  OAStatus.DIAMOND,
  OAStatus.GOLD,
  OAStatus.BRONZE,
  OAStatus.HYBRID,
]

const DIRECTORY_KPI_MONTHS = 24

const SUBDIVISION_CATEGORIES: OrganizationCategory[] = [
  OrganizationCategory.institution_subdivision,
  OrganizationCategory.unit_subdivision,
]

export class OrganizationUnitService {
  private organizationUnitDAO: OrganizationUnitDAO

  constructor() {
    this.organizationUnitDAO = new OrganizationUnitDAO()
  }

  /**
   * The research-structures directory: every structure (external and hidden
   * categories included — filtering is a client display concern) with its
   * parent relationships and KPIs over the last 24 months.
   *
   * KPI perimeters follow the dashboard rules (one hop):
   * - institution: members of the research units member_of it;
   * - institution/unit subdivision: direct members plus members of the
   *   units member_of or part_of it;
   * - anything else: direct members.
   */
  async getDirectory(): Promise<OrganizationDirectoryEntry[]> {
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - DIRECTORY_KPI_MONTHS)

    const documentDAO = new DocumentDAO()
    const [units, membershipPairs, documentStats] = await Promise.all([
      this.organizationUnitDAO.fetchDirectoryUnits(),
      this.organizationUnitDAO.fetchMembershipPairs(),
      documentDAO.fetchDocumentStatsSince(cutoff),
    ])

    const directMembers = new Map<string, Set<number>>()
    for (const pair of membershipPairs) {
      let members = directMembers.get(pair.orgUid)
      if (!members) {
        members = new Set()
        directMembers.set(pair.orgUid, members)
      }
      members.add(pair.personId)
    }

    const categoryByUid = new Map(
      units.map((unit) => [unit.uid, unit.category]),
    )
    const childrenByParentUid = new Map<
      string,
      { childUid: string; kind: OrganizationRelationKind }[]
    >()
    for (const unit of units) {
      for (const relation of unit.parents ?? []) {
        const children = childrenByParentUid.get(relation.parent.uid) ?? []
        children.push({ childUid: unit.uid, kind: relation.kind })
        childrenByParentUid.set(relation.parent.uid, children)
      }
    }

    const perimeterPersonIds = (unit: {
      uid: string
      category: OrganizationCategory
    }): Set<number> => {
      const people = new Set<number>()
      const addDirect = (orgUid: string) =>
        directMembers.get(orgUid)?.forEach((personId) => people.add(personId))

      if (unit.category === OrganizationCategory.institution) {
        for (const child of childrenByParentUid.get(unit.uid) ?? []) {
          if (
            child.kind === OrganizationRelationKind.member_of &&
            categoryByUid.get(child.childUid) ===
              OrganizationCategory.research_unit
          ) {
            addDirect(child.childUid)
          }
        }
        return people
      }
      addDirect(unit.uid)
      if (SUBDIVISION_CATEGORIES.includes(unit.category)) {
        for (const child of childrenByParentUid.get(unit.uid) ?? []) {
          addDirect(child.childUid)
        }
      }
      return people
    }

    const documentIndexesByPersonId = new Map<number, number[]>()
    documentStats.forEach((document, index) => {
      for (const personId of document.personIds) {
        const indexes = documentIndexesByPersonId.get(personId) ?? []
        indexes.push(index)
        documentIndexesByPersonId.set(personId, indexes)
      }
    })
    const isOpenAccess = (document: (typeof documentStats)[number]) =>
      (document.oaStatus !== null &&
        OPEN_ACCESS_STATUSES.includes(document.oaStatus)) ||
      (document.upwOAStatus !== null &&
        OPEN_ACCESS_STATUSES.includes(document.upwOAStatus))

    return units.map((unit) => {
      const people = perimeterPersonIds(unit)
      const documentIndexes = new Set<number>()
      people.forEach((personId) =>
        documentIndexesByPersonId
          .get(personId)
          ?.forEach((index) => documentIndexes.add(index)),
      )
      let openAccessCount = 0
      let halCount = 0
      documentIndexes.forEach((index) => {
        const document = documentStats[index]
        if (isOpenAccess(document)) {
          openAccessCount++
        }
        if (document.hasHalRecord) {
          halCount++
        }
      })
      const publicationsCount = documentIndexes.size

      return {
        uid: unit.uid,
        slug: unit.slug,
        acronym: unit.acronym,
        names: unit.labels
          .filter((label) => label.kind === 'long')
          .map(Literal.fromObject),
        category: unit.category,
        genericType: unit.genericType,
        nationalType: unit.nationalType,
        external: unit.external,
        parents: (unit.parents ?? []).map((relation) => ({
          parentUid: relation.parent.uid,
          kind: relation.kind,
          position: relation.position,
        })),
        membersCount: people.size,
        publicationsCount,
        oaRate: publicationsCount
          ? Math.round((100 * openAccessCount) / publicationsCount)
          : 0,
        halRate: publicationsCount
          ? Math.round((100 * halCount) / publicationsCount)
          : 0,
      }
    })
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
