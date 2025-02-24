import { Concept as DbConcept, LabelType, PrismaClient } from '@prisma/client'
import { Concept } from '@/types/Concept'
import { Literal } from '@/types/Literal'

export class ConceptDAO {
  private prismaClient: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prismaClient = prismaClient || new PrismaClient()
  }

  /**
   * Create or update a Concept record in the database.
   * It upserts the concept and its labels based on the provided domain Concept.
   *
   * @param concept - The Concept object containing uid, uri, prefLabels, and altLabels
   * @returns The created or updated Concept record from the database
   */
  public async createOrUpdateConcept(concept: Concept): Promise<DbConcept> {
    try {
      let dbConcept: DbConcept | null =
        await this.prismaClient.concept.findUnique({
          where: { uid: concept.uid },
          include: { labels: true },
        })

      if (!dbConcept) {
        dbConcept = await this.prismaClient.concept.create({
          data: {
            uid: concept.uid,
            uri: concept.uri,
            labels: {
              create: [
                ...concept.prefLabels.map((label: Literal) => ({
                  language: label.language,
                  value: label.value,
                  type: LabelType.PREF,
                })),
                ...concept.altLabels.map((label: Literal) => ({
                  language: label.language,
                  value: label.value,
                  type: LabelType.ALT,
                })),
              ],
            },
          },
          include: { labels: true },
        })
      } else {
        // Update the concept's URI if needed
        dbConcept = await this.prismaClient.concept.update({
          where: { uid: concept.uid },
          data: {
            uri: concept.uri,
          },
          include: { labels: true },
        })

        // Upsert preferred labels
        for (const label of concept.prefLabels) {
          await this.prismaClient.conceptLabel.upsert({
            where: {
              conceptId_language_type: {
                conceptId: dbConcept.id,
                language: label.language,
                type: LabelType.PREF,
              },
            },
            update: { value: label.value },
            create: {
              conceptId: dbConcept.id,
              language: label.language,
              value: label.value,
              type: LabelType.PREF,
            },
          })
        }

        // Upsert alternative labels
        for (const label of concept.altLabels) {
          await this.prismaClient.conceptLabel.upsert({
            where: {
              conceptId_language_type: {
                conceptId: dbConcept.id,
                language: label.language,
                type: LabelType.ALT,
              },
            },
            update: { value: label.value },
            create: {
              conceptId: dbConcept.id,
              language: label.language,
              value: label.value,
              type: LabelType.ALT,
            },
          })
        }
      }

      return dbConcept
    } catch (error) {
      console.error('Error in createOrUpdateConcept:', error)
      throw new Error(
        `Failed to create or update concept: ${(error as Error).message}`,
      )
    }
  }
}
