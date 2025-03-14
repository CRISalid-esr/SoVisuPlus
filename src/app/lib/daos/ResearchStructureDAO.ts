import { ResearchStructureWithRelations as DbResearchStructure } from '@/prisma-schema/extended-client'
import { ResearchStructureIdentifierType as DbResearchStructureIdentifierType } from '@prisma/client'
import { ResearchStructure } from '@/types/ResearchStructure'
import { ResearchStructureIdentifier } from '@/types/ResearchStructureIdentifier'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import slugify from 'slugify'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

/** ResearchStructureDAO: Handles operations related to ResearchStructure and ResearchStructureIdentifiers */
export class ResearchStructureDAO extends AbstractDAO {
  /**
   * Create or update a ResearchStructure record in the database
   * @param researchStructure - The ResearchStructure object to upsert
   * @returns The created or updated ResearchStructure record
   */
  public async createOrUpdateResearchStructure(
    researchStructure: ResearchStructure,
  ): Promise<DbResearchStructure> {
    try {
      const baseSlug = this.generateBaseSlug(researchStructure)
      let uniqueSlug = null
      let counter = 1

      if (baseSlug) {
        uniqueSlug = baseSlug
        while (await this.slugExists(uniqueSlug, researchStructure.uid)) {
          uniqueSlug = `${baseSlug}-${counter}`
          counter++
        }
      }

      const maxRetries = 3
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const dbResearchStructure =
            (await this.prismaClient.researchStructure.upsert({
              where: { uid: researchStructure.uid },
              update: {
                acronym: researchStructure.acronym,
                slug: uniqueSlug,
              },
              create: {
                uid: researchStructure.uid,
                acronym: researchStructure.acronym,
                slug: uniqueSlug,
              },
              include: {
                names: true,
                descriptions: true,
                identifiers: true,
              },
            })) as DbResearchStructure

          for (const name of researchStructure.names) {
            await this.prismaClient.researchStructureName.upsert({
              where: {
                researchStructureId_language: {
                  researchStructureId: dbResearchStructure.id,
                  language: name.language,
                },
              },
              update: { value: name.value },
              create: {
                researchStructureId: dbResearchStructure.id,
                language: name.language,
                value: name.value,
              },
            })
          }

          for (const description of researchStructure.descriptions) {
            await this.prismaClient.researchStructureDescription.upsert({
              where: {
                researchStructureId_language: {
                  researchStructureId: dbResearchStructure.id,
                  language: description.language,
                },
              },
              update: { value: description.value },
              create: {
                researchStructureId: dbResearchStructure.id,
                language: description.language,
                value: description.value,
              },
            })
          }

          await this.prismaClient.researchStructureIdentifier.deleteMany({
            where: { researchStructureId: dbResearchStructure.id },
          })

          for (const identifier of researchStructure.identifiers) {
            await this.prismaClient.researchStructureIdentifier.create({
              data: {
                researchStructureId: dbResearchStructure.id,
                type: identifier.type.toUpperCase() as DbResearchStructureIdentifierType,
                value: identifier.value,
              },
            })
          }

          return dbResearchStructure
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
      console.error('Error during research structure upsert:', error)
      throw new Error(
        `Failed to upsert research structure: ${(error as Error).message}`,
      )
    }
  }

  /**
   * Upsert ResearchStructureIdentifiers for a given research structure
   * @param identifiers - The list of identifiers to upsert
   * @param researchStructureId - The ID of the research structure
   */
  private async upsertIdentifiers(
    identifiers: ResearchStructureIdentifier[],
    researchStructureId: number,
  ): Promise<void> {
    await this.prismaClient.researchStructureIdentifier.deleteMany({
      where: { researchStructureId },
    })

    await this.prismaClient.researchStructureIdentifier.createMany({
      data: identifiers.map((identifier) => ({
        researchStructureId,
        type: identifier.type.toUpperCase() as DbResearchStructureIdentifierType,
        value: identifier.value,
      })),
    })
  }

  /**
   * Get a ResearchStructure record by its UID
   * @param uid - The UID of the ResearchStructure to retrieve
   * @returns The ResearchStructure record
   */
  public async getResearchStructureByUid(
    uid: string,
  ): Promise<DbResearchStructure | null> {
    return this.prismaClient.researchStructure.findUnique({
      where: { uid },
      include: {
        names: true,
        descriptions: true,
        identifiers: true,
      },
    })
  }

  /**
   * Generate a base slug for the research structure
   * @param researchStructure - The research structure object
   * @returns The base slug string
   */
  private generateBaseSlug(
    researchStructure: ResearchStructure,
  ): string | null {
    const supportedLocales =
      process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',') || []

    const slugPrefix = 'research-structure:'

    if (researchStructure.acronym) {
      return `${slugPrefix}${slugify(researchStructure.acronym, { lower: true, strict: true })}`
    }

    for (const locale of supportedLocales) {
      const name = researchStructure.names.find((n) => n.language === locale)
      if (name) {
        return `${slugPrefix}${slugify(name.value, { lower: true, strict: true })}`
      }
    }

    return null
  }

  /**
   * Check if a slug already exists
   * @param slug - The slug to check
   * @param uid - The unique ID of the research structure
   * @returns True if the slug exists, otherwise false
   */
  private async slugExists(slug: string, uid: string): Promise<boolean> {
    const existing = await this.prismaClient.researchStructure.findFirst({
      where: { slug, NOT: { uid } },
    })
    return !!existing
  }

  /**
   * Get a ResearchStructure record by its slug
   * @param slug - The slug of the ResearchStructure to retrieve
   * @returns The ResearchStructure record as a ResearchStructure object
   */
  public async fetchResearchStructureBySlug(
    slug: string,
  ): Promise<ResearchStructure | null> {
    const dbResearchStructure =
      await this.prismaClient.researchStructure.findFirst({
        where: { slug },
        include: {
          names: true,
          descriptions: true,
          identifiers: true,
        },
      })
    return dbResearchStructure
      ? ResearchStructure.fromDbResearchStructure(dbResearchStructure)
      : null
  }
}
