import { ResearchUnitWithRelations as DbResearchUnit } from '@/prisma-schema/extended-client'
import { Prisma } from '@prisma/client'
import { ResearchUnit } from '@/types/ResearchUnit'
import {
  ResearchUnitIdentifier,
  researchUnitIdentifierTypeFromString,
} from '@/types/ResearchUnitIdentifier'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import slugify from 'slugify'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import QueryMode = Prisma.QueryMode

/** ResearchUnitDAO: Handles operations related to ResearchUnit and ResearchUnitIdentifiers */
export class ResearchUnitDAO extends AbstractDAO {
  /**
   * Create or update a ResearchUnit record in the database
   * @param researchUnit - The ResearchUnit object to upsert
   * @returns The created or updated ResearchUnit record
   */
  public async createOrUpdateResearchUnit(
    researchUnit: ResearchUnit,
  ): Promise<DbResearchUnit> {
    try {
      const baseSlug = this.generateBaseSlug(researchUnit)
      let uniqueSlug = null
      let counter = 1

      if (baseSlug) {
        uniqueSlug = baseSlug
        while (await this.slugExists(uniqueSlug, researchUnit.uid)) {
          uniqueSlug = `${baseSlug}-${counter}`
          counter++
        }
      }

      const maxRetries = 3
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const dbResearchUnit = (await this.prismaClient.researchUnit.upsert({
            where: { uid: researchUnit.uid },
            update: {
              acronym: researchUnit.acronym,
              signature: researchUnit.signature,
              slug: uniqueSlug,
            },
            create: {
              uid: researchUnit.uid,
              acronym: researchUnit.acronym,
              signature: researchUnit.signature,
              slug: uniqueSlug,
            },
            include: {
              names: true,
              descriptions: true,
              identifiers: true,
            },
          })) as DbResearchUnit

          for (const name of researchUnit.names) {
            await this.prismaClient.researchUnitName.upsert({
              where: {
                researchUnitId_language: {
                  researchUnitId: dbResearchUnit.id,
                  language: name.language,
                },
              },
              update: { value: name.value },
              create: {
                researchUnitId: dbResearchUnit.id,
                language: name.language,
                value: name.value,
              },
            })
          }

          for (const description of researchUnit.descriptions) {
            await this.prismaClient.researchUnitDescription.upsert({
              where: {
                researchUnitId_language: {
                  researchUnitId: dbResearchUnit.id,
                  language: description.language,
                },
              },
              update: { value: description.value },
              create: {
                researchUnitId: dbResearchUnit.id,
                language: description.language,
                value: description.value,
              },
            })
          }

          await this.prismaClient.researchUnitIdentifier.deleteMany({
            where: { researchUnitId: dbResearchUnit.id },
          })

          for (const identifier of researchUnit.identifiers) {
            await this.prismaClient.researchUnitIdentifier.create({
              data: {
                researchUnitId: dbResearchUnit.id,
                type: researchUnitIdentifierTypeFromString(identifier.type),
                value: identifier.value,
              },
            })
          }

          return dbResearchUnit
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
      console.error('Error during research unit upsert:', error)
      throw new Error(
        `Failed to upsert research unit: ${(error as Error).message}`,
      )
    }
  }

  /**
   * Upsert ResearchUnitIdentifiers for a given research unit
   * @param identifiers - The list of identifiers to upsert
   * @param researchUnitId - The ID of the research unit
   */
  private async upsertIdentifiers(
    identifiers: ResearchUnitIdentifier[],
    researchUnitId: number,
  ): Promise<void> {
    await this.prismaClient.researchUnitIdentifier.deleteMany({
      where: { researchUnitId },
    })

    await this.prismaClient.researchUnitIdentifier.createMany({
      data: identifiers.map((identifier) => ({
        researchUnitId,
        type: researchUnitIdentifierTypeFromString(identifier.type),
        value: identifier.value,
      })),
    })
  }

  /**
   * Get a ResearchUnit record by its UID
   * @param uid - The UID of the ResearchUnit to retrieve
   * @returns The ResearchUnit record
   */
  public async getResearchUnitByUid(
    uid: string,
  ): Promise<DbResearchUnit | null> {
    return this.prismaClient.researchUnit.findUnique({
      where: { uid },
      include: {
        names: true,
        descriptions: true,
        identifiers: true,
      },
    })
  }

  /**
   * Generate a base slug for the research unit
   * @param researchUnit - The research unit object
   * @returns The base slug string
   */
  private generateBaseSlug(researchUnit: ResearchUnit): string | null {
    const supportedLocales =
      process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',') || []

    const slugPrefix = 'research-unit:'

    if (researchUnit.acronym) {
      return `${slugPrefix}${slugify(researchUnit.acronym, { lower: true, strict: true })}`
    }

    for (const locale of supportedLocales) {
      const name = researchUnit.names.find((n) => n.language === locale)
      if (name) {
        return `${slugPrefix}${slugify(name.value, { lower: true, strict: true })}`
      }
    }

    return null
  }

  /**
   * Check if a slug already exists
   * @param slug - The slug to check
   * @param uid - The unique ID of the research unit
   * @returns True if the slug exists, otherwise false
   */
  private async slugExists(slug: string, uid: string): Promise<boolean> {
    const existing = await this.prismaClient.researchUnit.findFirst({
      where: { slug, NOT: { uid } },
    })
    return !!existing
  }

  /**
   * Get a ResearchUnit record by its slug
   * @param slug - The slug of the ResearchUnit to retrieve
   * @returns The ResearchUnit record as a ResearchUnit object
   */
  public async fetchResearchUnitBySlug(
    slug: string,
  ): Promise<ResearchUnit | null> {
    const dbResearchUnit = await this.prismaClient.researchUnit.findFirst({
      where: { slug },
      include: {
        names: true,
        descriptions: true,
        identifiers: true,
      },
    })
    return dbResearchUnit
      ? ResearchUnit.fromDbResearchUnit(dbResearchUnit)
      : null
  }

  /**
   * Get a list of ResearchUnit records based on a search term
   * @param searchTerm
   * @param pageNumber
   * @param itemsPerPage
   */
  async getResearchUnits(
    searchTerm: string,
    pageNumber: number,
    itemsPerPage: number,
  ): Promise<ResearchUnit[]> {
    const whereClause = {
      names: {
        some: {
          value: {
            contains: searchTerm,
            mode: QueryMode.insensitive,
          },
        },
      },
    }
    const researchUnits = (await this.prismaClient.researchUnit.findMany({
      where: whereClause,
      skip: (pageNumber - 1) * itemsPerPage,
      take: itemsPerPage,
      select: {
        id: true,
        uid: true,
        acronym: true,
        external: true,
        names: {
          select: {
            value: true,
            language: true,
          },
        },
        descriptions: {
          select: {
            value: true,
            language: true,
          },
        },
        signature: true,
        slug: true,
      },
      orderBy: {
        names: {
          _count: 'asc',
        },
      },
    })) as DbResearchUnit[]
    return researchUnits.map(ResearchUnit.fromDbResearchUnit)
  }

  async countResearchUnits(searchTerm: string) {
    return this.prismaClient.researchUnit.count({
      where: {
        names: {
          some: {
            value: {
              contains: searchTerm,
              mode: QueryMode.insensitive,
            },
          },
        },
      },
    })
  }
}
