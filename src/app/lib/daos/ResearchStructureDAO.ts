import { ResearchStructureWithRelations as DbResearchStructure } from '@/prisma-schema/extended-client'
import { ResearchStructureIdentifierType as DbResearchStructureIdentifierType } from '@prisma/client'
import { ResearchStructure } from '@/types/ResearchStructure'
import { ResearchStructureIdentifier } from '@/types/ResearchStructureIdentifier'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'

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
      let dbResearchStructure =
        (await this.prismaClient.researchStructure.findUnique({
          where: { uid: researchStructure.uid },
          include: {
            names: true,
            descriptions: true,
            identifiers: true,
          },
        })) as DbResearchStructure | null

      if (!dbResearchStructure) {
        dbResearchStructure = (await this.prismaClient.researchStructure.create(
          {
            data: {
              uid: researchStructure.uid,
              acronym: researchStructure.acronym,
            },
            include: {
              names: true,
              descriptions: true,
              identifiers: true,
            },
          },
        )) as DbResearchStructure
      } else {
        dbResearchStructure = (await this.prismaClient.researchStructure.update(
          {
            where: { uid: researchStructure.uid },
            data: {
              acronym: researchStructure.acronym,
            },
            include: {
              names: true,
              descriptions: true,
              identifiers: true,
            },
          },
        )) as DbResearchStructure
      }

      for (const name of researchStructure.names) {
        await this.prismaClient.researchStructureName.upsert({
          where: {
            researchStructureId_language: {
              researchStructureId: dbResearchStructure.id,
              language: name.language,
            },
          },
          update: {
            value: name.value,
          },
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
          update: {
            value: description.value,
          },
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
      console.error('Error during research structure upsert:', error as Error)
      throw new Error(
        `Failed to create or update research structure: ${(error as Error).message}`,
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
}
