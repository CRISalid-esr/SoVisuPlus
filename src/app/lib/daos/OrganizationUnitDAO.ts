import {
  organizationUnitInclude,
  OrganizationUnitWithRelations as DbOrganizationUnitWithRelations,
} from '@/prisma-schema/extended-client'
import {
  OrganizationCategory,
  OrganizationUnit as DbOrganizationUnit,
  Prisma,
} from '@prisma/client'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { organizationIdentifierTypeFromString } from '@/types/OrganizationUnitIdentifier'
import { OrganizationGroup } from '@/types/IAgent'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import slugify from 'slugify'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import QueryMode = Prisma.QueryMode

export type { OrganizationGroup }

/**
 * Perspective group → concrete categories reachable through search.
 * Support, administrative and teaching units belong to no group:
 * they are stored for the organizational tree only.
 */
const GROUP_CATEGORIES: Record<OrganizationGroup, OrganizationCategory[]> = {
  institution: [OrganizationCategory.institution],
  research_unit: [OrganizationCategory.research_unit],
  other_structure: [
    OrganizationCategory.institution_subdivision,
    OrganizationCategory.doctoral_school,
    OrganizationCategory.unit_subdivision,
  ],
  team: [OrganizationCategory.team],
}

export const groupToCategories = (
  group: OrganizationGroup,
): OrganizationCategory[] => GROUP_CATEGORIES[group]

/** OrganizationUnitDAO: Handles operations related to OrganizationUnit records */
export class OrganizationUnitDAO extends AbstractDAO {
  /**
   * Create or update an OrganizationUnit record in the database
   * @param organizationUnit - The OrganizationUnit object to upsert
   * @returns The created or updated OrganizationUnit record
   */
  public async createOrUpdateOrganizationUnit(
    organizationUnit: OrganizationUnit,
  ): Promise<DbOrganizationUnit> {
    try {
      const baseSlug = this.generateBaseSlug(organizationUnit)
      let uniqueSlug = null
      let counter = 1

      if (baseSlug) {
        uniqueSlug = baseSlug
        while (await this.slugExists(uniqueSlug, organizationUnit.uid)) {
          uniqueSlug = `${baseSlug}-${counter}`
          counter++
        }
      }

      const maxRetries = 3
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const scalarFields = {
            genericType: organizationUnit.genericType,
            category: organizationUnit.category,
            nationalType: organizationUnit.nationalType,
            external: organizationUnit.external,
            acronym: organizationUnit.acronym,
            localTypes:
              organizationUnit.localTypes as unknown as Prisma.InputJsonValue,
            slug: uniqueSlug,
          }
          const dbOrganizationUnit =
            await this.prismaClient.organizationUnit.upsert({
              where: { uid: organizationUnit.uid },
              update: scalarFields,
              create: {
                uid: organizationUnit.uid,
                ...scalarFields,
              },
            })

          await this.upsertLabels(organizationUnit, dbOrganizationUnit.id)
          await this.upsertDescriptions(organizationUnit, dbOrganizationUnit.id)
          await this.upsertIdentifiers(organizationUnit, dbOrganizationUnit.id)
          await this.upsertRelationships(
            organizationUnit,
            dbOrganizationUnit.id,
          )

          return dbOrganizationUnit
        } catch (error) {
          if (
            error instanceof PrismaClientKnownRequestError &&
            error.code === 'P2002' && // Unique constraint violation
            baseSlug
          ) {
            console.error(
              `Slug collision detected for '${uniqueSlug}', retrying...`,
            )

            uniqueSlug = `${baseSlug}-${counter}`
            counter++

            const delay = Math.floor(
              Math.random() * (100 * Math.pow(2, attempt)),
            )
            await new Promise((resolve) => setTimeout(resolve, delay))
          } else {
            throw error // rethrow unexpected errors
          }
        }
      }

      throw new Error(`Number of max retries reached`)
    } catch (error) {
      console.error('Error during organization unit upsert:', error)
      throw new Error(
        `Failed to upsert organization unit: ${(error as Error).message}`,
      )
    }
  }

  /**
   * Replace the long labels of an organization unit with the incoming ones.
   * Incoming data is authoritative: labels absent from it are removed.
   */
  private async upsertLabels(
    organizationUnit: OrganizationUnit,
    organizationUnitId: number,
  ): Promise<void> {
    await this.prismaClient.organizationUnitLabel.deleteMany({
      where: {
        organizationUnitId,
        kind: 'long',
        NOT: {
          language: { in: organizationUnit.names.map((n) => n.language) },
        },
      },
    })
    for (const name of organizationUnit.names) {
      await this.prismaClient.organizationUnitLabel.upsert({
        where: {
          organizationUnitId_kind_language: {
            organizationUnitId,
            kind: 'long',
            language: name.language,
          },
        },
        update: { value: name.value },
        create: {
          organizationUnitId,
          kind: 'long',
          language: name.language,
          value: name.value,
        },
      })
    }
  }

  /**
   * Replace the descriptions of an organization unit with the incoming ones.
   * Incoming data is authoritative: descriptions absent from it are removed.
   */
  private async upsertDescriptions(
    organizationUnit: OrganizationUnit,
    organizationUnitId: number,
  ): Promise<void> {
    await this.prismaClient.organizationUnitDescription.deleteMany({
      where: {
        organizationUnitId,
        NOT: {
          language: {
            in: organizationUnit.descriptions.map((d) => d.language),
          },
        },
      },
    })
    for (const description of organizationUnit.descriptions) {
      await this.prismaClient.organizationUnitDescription.upsert({
        where: {
          organizationUnitId_language: {
            organizationUnitId,
            language: description.language,
          },
        },
        update: { value: description.value },
        create: {
          organizationUnitId,
          language: description.language,
          value: description.value,
        },
      })
    }
  }

  /**
   * Replace the identifiers of an organization unit with the incoming ones.
   */
  private async upsertIdentifiers(
    organizationUnit: OrganizationUnit,
    organizationUnitId: number,
  ): Promise<void> {
    await this.prismaClient.organizationUnitIdentifier.deleteMany({
      where: { organizationUnitId },
    })

    for (const identifier of organizationUnit.identifiers) {
      await this.prismaClient.organizationUnitIdentifier.create({
        data: {
          organizationUnitId,
          type: organizationIdentifierTypeFromString(identifier.type),
          value: identifier.value,
        },
      })
    }
  }

  /**
   * Replace the organization-to-organization relationships where this unit
   * is the child. Incoming data is authoritative: relationships absent from
   * it are removed. Rows where the unit is the parent belong to the
   * children's own sync and are untouched, as are person-to-organization
   * rows (Membership, Employment).
   */
  private async upsertRelationships(
    organizationUnit: OrganizationUnit,
    childId: number,
  ): Promise<void> {
    await this.prismaClient.organizationRelationship.deleteMany({
      where: { childId },
    })

    for (const relation of organizationUnit.parents) {
      const parentId = await this.resolveParentId(relation.parent)
      if (parentId === null) {
        continue
      }
      await this.prismaClient.organizationRelationship.create({
        data: {
          childId,
          parentId,
          kind: relation.kind,
          position: relation.position,
          startDate: relation.startDate ? new Date(relation.startDate) : null,
          endDate: relation.endDate ? new Date(relation.endDate) : null,
        },
      })
    }
  }

  /**
   * Resolve a relationship parent to a database id. When the parent is not
   * yet known (out-of-order messages, or external registry institutions
   * which never get their own message), it is shallow-created from the data
   * carried by the relationship edge. An existing parent is never
   * overwritten — its own message owns its data.
   */
  private async resolveParentId(
    parent: OrganizationUnit,
  ): Promise<number | null> {
    const existing = await this.prismaClient.organizationUnit.findUnique({
      where: { uid: parent.uid },
    })
    if (existing) {
      return existing.id
    }
    try {
      const created = await this.createOrUpdateOrganizationUnit(parent)
      return created.id
    } catch (error) {
      // Two structures can shallow-create the same parent concurrently: on
      // any failure, re-check before giving up on the relationship.
      const refetched = await this.prismaClient.organizationUnit.findUnique({
        where: { uid: parent.uid },
      })
      if (refetched) {
        return refetched.id
      }
      console.error(
        `Failed to create parent organization ${parent.uid}, skipping relationship`,
        error,
      )
      return null
    }
  }

  /**
   * Get an OrganizationUnit record by its UID
   * @param uid - The UID of the OrganizationUnit to retrieve
   * @returns The OrganizationUnit record
   */
  public async getOrganizationUnitByUid(
    uid: string,
  ): Promise<DbOrganizationUnitWithRelations | null> {
    return this.prismaClient.organizationUnit.findUnique({
      where: { uid },
      include: organizationUnitInclude,
    })
  }

  /**
   * Generate a base slug for the organization unit
   * @param organizationUnit - The organization unit object
   * @returns The base slug string
   */
  private generateBaseSlug(organizationUnit: OrganizationUnit): string | null {
    const supportedLocales =
      process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',') || []

    const slugPrefix = 'org:'

    if (organizationUnit.acronym) {
      return `${slugPrefix}${slugify(organizationUnit.acronym, { lower: true, strict: true })}`
    }

    for (const locale of supportedLocales) {
      const name = organizationUnit.names.find((n) => n.language === locale)
      if (name) {
        return `${slugPrefix}${slugify(name.value, { lower: true, strict: true })}`
      }
    }

    return null
  }

  /**
   * Check if a slug already exists
   * @param slug - The slug to check
   * @param uid - The unique ID of the organization unit
   * @returns True if the slug exists, otherwise false
   */
  private async slugExists(slug: string, uid: string): Promise<boolean> {
    const existing = await this.prismaClient.organizationUnit.findFirst({
      where: { slug, NOT: { uid } },
    })
    return !!existing
  }

  /**
   * Get an OrganizationUnit record by its slug
   * @param slug - The slug of the OrganizationUnit to retrieve
   * @returns The OrganizationUnit record as an OrganizationUnit object
   */
  public async fetchOrganizationUnitBySlug(
    slug: string,
  ): Promise<OrganizationUnit | null> {
    const dbOrganizationUnit =
      await this.prismaClient.organizationUnit.findFirst({
        where: { slug },
        include: organizationUnitInclude,
      })
    return dbOrganizationUnit
      ? OrganizationUnit.fromDbOrganizationUnit(dbOrganizationUnit)
      : null
  }

  /** Lightweight category lookup, without the directory includes. */
  public async fetchCategoryByUid(
    uid: string,
  ): Promise<OrganizationCategory | null> {
    const unit = await this.prismaClient.organizationUnit.findUnique({
      where: { uid },
      select: { category: true },
    })
    return unit?.category ?? null
  }

  /**
   * All organization units with their labels and parent relationships —
   * the raw material of the research-structures directory. External
   * structures are always included (filtering them is a display concern);
   * hidden ones only when `includeHidden` is set, which the directory route
   * grants to structure managers alone.
   */
  public async fetchDirectoryUnits(includeHidden: boolean = false) {
    return this.prismaClient.organizationUnit.findMany({
      where: includeHidden ? undefined : { hiddenEffective: false },
      include: {
        labels: true,
        parents: {
          select: {
            kind: true,
            position: true,
            parent: { select: { uid: true } },
          },
        },
      },
    })
  }

  /**
   * Set the explicit visibility flag of a structure, and report whether the
   * structure exists. `hiddenEffective` is not touched here: it is recomputed
   * for the whole graph afterwards by OrganizationUnitService.
   */
  public async setHidden(uid: string, hidden: boolean): Promise<boolean> {
    const { count } = await this.prismaClient.organizationUnit.updateMany({
      where: { uid },
      data: { hidden },
    })
    return count > 0
  }

  /** Both visibility flags of a single structure. */
  public async fetchVisibilityState(uid: string): Promise<{
    uid: string
    hidden: boolean
    hiddenEffective: boolean
  } | null> {
    return this.prismaClient.organizationUnit.findUnique({
      where: { uid },
      select: { uid: true, hidden: true, hiddenEffective: true },
    })
  }

  /**
   * The raw material of the effective-visibility computation: every structure
   * with its explicit flag, plus every child → parent link, both kinds.
   */
  public async fetchVisibilityGraph(): Promise<{
    units: { uid: string; hidden: boolean }[]
    relations: { childUid: string; parentUid: string }[]
  }> {
    const [units, relations] = await Promise.all([
      this.prismaClient.organizationUnit.findMany({
        select: { uid: true, hidden: true },
      }),
      this.prismaClient.organizationRelationship.findMany({
        select: {
          child: { select: { uid: true } },
          parent: { select: { uid: true } },
        },
      }),
    ])
    return {
      units,
      relations: relations.map((relation) => ({
        childUid: relation.child.uid,
        parentUid: relation.parent.uid,
      })),
    }
  }

  /**
   * Write back the outcome of the computation: exactly the structures in
   * `hiddenUids` carry `hiddenEffective`, every other one does not.
   */
  public async applyEffectiveHidden(hiddenUids: string[]): Promise<void> {
    await this.prismaClient.$transaction([
      this.prismaClient.organizationUnit.updateMany({
        where: { uid: { in: hiddenUids }, hiddenEffective: false },
        data: { hiddenEffective: true },
      }),
      this.prismaClient.organizationUnit.updateMany({
        where: { uid: { notIn: hiddenUids }, hiddenEffective: true },
        data: { hiddenEffective: false },
      }),
    ])
  }

  /**
   * All person-to-organization membership pairs, used to compute the
   * directory perimeters in one pass. Memberships toward a hidden structure
   * are left out unless `includeHidden` is set, so its members stop counting
   * in the KPIs of its parents.
   */
  public async fetchMembershipPairs(
    includeHidden: boolean = false,
  ): Promise<
    { personId: number; orgUid: string; orgCategory: OrganizationCategory }[]
  > {
    const memberships = await this.prismaClient.membership.findMany({
      where: includeHidden
        ? undefined
        : { organizationUnit: { hiddenEffective: false } },
      select: {
        personId: true,
        organizationUnit: { select: { uid: true, category: true } },
      },
    })
    return memberships.map((membership) => ({
      personId: membership.personId,
      orgUid: membership.organizationUnit.uid,
      orgCategory: membership.organizationUnit.category,
    }))
  }

  /**
   * Search where-clause for a perspective group: matches on label values,
   * restricted to the group's categories, always excluding external
   * structures (registry-created relationship targets without labels) and
   * hidden ones (a hidden structure is not a selectable perspective, not
   * even for a structure manager).
   */
  private searchWhereClause(
    searchTerm: string,
    group: OrganizationGroup,
  ): Prisma.OrganizationUnitWhereInput {
    return {
      external: false,
      hiddenEffective: false,
      category: { in: groupToCategories(group) },
      labels: {
        some: {
          value: {
            contains: searchTerm,
            mode: QueryMode.insensitive,
          },
        },
      },
    }
  }

  /**
   * Get a list of OrganizationUnit records based on a search term
   * @param searchTerm
   * @param group - perspective group to search within
   * @param pageNumber
   * @param itemsPerPage
   */
  async getOrganizationUnits(
    searchTerm: string,
    group: OrganizationGroup,
    pageNumber: number,
    itemsPerPage: number,
  ): Promise<OrganizationUnit[]> {
    const organizationUnits = await this.prismaClient.organizationUnit.findMany(
      {
        where: this.searchWhereClause(searchTerm, group),
        skip: (pageNumber - 1) * itemsPerPage,
        take: itemsPerPage,
        include: organizationUnitInclude,
        orderBy: {
          labels: {
            _count: 'asc',
          },
        },
      },
    )
    return organizationUnits.map(OrganizationUnit.fromDbOrganizationUnit)
  }

  async countOrganizationUnits(searchTerm: string, group: OrganizationGroup) {
    return this.prismaClient.organizationUnit.count({
      where: this.searchWhereClause(searchTerm, group),
    })
  }
}
