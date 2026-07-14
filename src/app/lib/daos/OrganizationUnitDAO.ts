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

  /**
   * Search where-clause for a perspective group: matches on label values,
   * restricted to the group's categories, always excluding external
   * structures (registry-created relationship targets without labels).
   */
  private searchWhereClause(
    searchTerm: string,
    group: OrganizationGroup,
  ): Prisma.OrganizationUnitWhereInput {
    return {
      external: false,
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
