import {
  ResearchStructure as DbResearchStructure,
  ResearchStructureIdentifierType as DbResearchStructureIdentifierType,
} from '@prisma/client'
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
      const dbResearchStructure: DbResearchStructure =
        await this.prismaClient.researchStructure.upsert({
          where: { uid: researchStructure.uid },
          update: {
            acronym: researchStructure.acronym,
            names: researchStructure.names,
            descriptions: researchStructure.descriptions,
          },
          create: {
            uid: researchStructure.uid,
            acronym: researchStructure.acronym,
            names: researchStructure.names,
            descriptions: researchStructure.descriptions,
          },
        })

      await this.upsertIdentifiers(
        researchStructure.identifiers,
        dbResearchStructure.id,
      )

      return dbResearchStructure
    } catch (error) {
      console.error('Error during research structure upsert:', error as Error)
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
}
