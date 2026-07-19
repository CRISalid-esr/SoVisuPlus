import {
  OrganizationGroup,
  OrganizationUnitDAO,
} from '@/lib/daos/OrganizationUnitDAO'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { StructureMember } from '@/types/StructureMember'
import removeAccents from 'remove-accents'
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
  OrganizationCategory.doctoral_school,
  OrganizationCategory.unit_subdivision,
]

const isOpenAccess = (document: {
  oaStatus: OAStatus | null
  upwOAStatus: OAStatus | null
}) =>
  (document.oaStatus !== null &&
    OPEN_ACCESS_STATUSES.includes(document.oaStatus)) ||
  (document.upwOAStatus !== null &&
    OPEN_ACCESS_STATUSES.includes(document.upwOAStatus))

export const STRUCTURE_MEMBER_SORT_KEYS = [
  'name',
  'startDate',
  'endDate',
  'publicationsCount',
  'oaRate',
  'halRate',
] as const

export type StructureMemberSortKey = (typeof STRUCTURE_MEMBER_SORT_KEYS)[number]

export interface StructureMembersQuery {
  uid: string
  present: boolean
  search: string
  sortBy: StructureMemberSortKey
  sortDesc: boolean
  /** 1-based */
  page: number
  pageSize: number
}

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

  /**
   * The paginated members table of a structure detail panel. Institutions
   * list their Employment rows; every other category lists direct Membership
   * rows (children's members are seen by selecting the child — no perimeter
   * aggregation, so the total may differ from the directory membersCount).
   *
   * Filtering (presence, name search), per-person KPIs over the directory
   * window, sorting and pagination all happen here, in memory: member sets
   * are at most a few thousand rows. Returns null for an unknown structure.
   */
  async getStructureMembers(
    query: StructureMembersQuery,
  ): Promise<{ members: StructureMember[]; total: number } | null> {
    const category = await this.organizationUnitDAO.fetchCategoryByUid(
      query.uid,
    )
    if (category === null) {
      return null
    }
    const kind =
      category === OrganizationCategory.institution
        ? 'employment'
        : 'membership'
    let members = await new PersonDAO().fetchStructureMembers(query.uid, kind)

    if (query.present) {
      const today = new Date().toISOString().slice(0, 10)
      members = members.filter(
        (member) => member.endDate === null || member.endDate >= today,
      )
    }
    const search = removeAccents(query.search.trim()).toLowerCase()
    if (search !== '') {
      members = members.filter((member) =>
        removeAccents(
          `${member.displayName} ${member.firstName} ${member.lastName}`,
        )
          .toLowerCase()
          .includes(search),
      )
    }

    if (members.length > 0) {
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - DIRECTORY_KPI_MONTHS)
      const documentStats = await new DocumentDAO().fetchDocumentStatsSince(
        cutoff,
      )
      const statsByPersonId = new Map<
        number,
        { documents: number; openAccess: number; hal: number }
      >()
      for (const document of documentStats) {
        const openAccess = isOpenAccess(document)
        for (const personId of new Set(document.personIds)) {
          const stats = statsByPersonId.get(personId) ?? {
            documents: 0,
            openAccess: 0,
            hal: 0,
          }
          stats.documents++
          if (openAccess) {
            stats.openAccess++
          }
          if (document.hasHalRecord) {
            stats.hal++
          }
          statsByPersonId.set(personId, stats)
        }
      }
      for (const member of members) {
        const stats = statsByPersonId.get(member.personId)
        if (stats) {
          member.publicationsCount = stats.documents
          member.oaRate = Math.round((100 * stats.openAccess) / stats.documents)
          member.halRate = Math.round((100 * stats.hal) / stats.documents)
        }
      }
    }

    const direction = query.sortDesc ? -1 : 1
    const compareNullableDates = (a: string | null, b: string | null) => {
      if (a === b) return 0
      // missing dates always sink to the bottom, whatever the direction
      if (a === null) return 1
      if (b === null) return -1
      return direction * a.localeCompare(b)
    }
    members.sort((a, b) => {
      switch (query.sortBy) {
        case 'startDate':
          return compareNullableDates(a.startDate, b.startDate)
        case 'endDate':
          return compareNullableDates(a.endDate, b.endDate)
        case 'publicationsCount':
        case 'oaRate':
        case 'halRate':
          return direction * (a[query.sortBy] - b[query.sortBy])
        default:
          return (
            direction *
            `${a.lastName} ${a.firstName} ${a.displayName}`.localeCompare(
              `${b.lastName} ${b.firstName} ${b.displayName}`,
              undefined,
              { sensitivity: 'base' },
            )
          )
      }
    })

    const total = members.length
    const start = (query.page - 1) * query.pageSize
    return { members: members.slice(start, start + query.pageSize), total }
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
