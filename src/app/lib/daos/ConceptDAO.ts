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

      const uniquePrefLabels = Array.from(
        new Map(
          concept.prefLabels.map((label) => [label.language, label]),
        ).values(),
      )
      const uniqueAltLabels = Array.from(
        new Map(
          concept.altLabels.map((label) => [label.language, label]),
        ).values(),
      )

      if (!dbConcept) {
        dbConcept = await this.prismaClient.concept.create({
          data: {
            uid: concept.uid,
            uri: concept.uri,
            labels: {
              create: [
                ...uniquePrefLabels.map((label: Literal) => ({
                  language: label.language,
                  value: label.value,
                  type: LabelType.PREF,
                })),
                ...uniqueAltLabels.map((label: Literal) => ({
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
        // For preflabels: enforce only one label per language manually
        for (const label of uniquePrefLabels) {
          const existingPrefLabel =
            await this.prismaClient.conceptLabel.findFirst({
              where: {
                conceptId: dbConcept.id,
                language: label.language,
                type: LabelType.PREF,
              },
            })
          if (existingPrefLabel) {
            // Update the existing label if the value is different
            if (existingPrefLabel.value !== label.value) {
              await this.prismaClient.conceptLabel.update({
                where: { id: existingPrefLabel.id },
                data: { value: label.value },
              })
            }
          } else {
            // Create a new preflabel record
            await this.prismaClient.conceptLabel.create({
              data: {
                conceptId: dbConcept.id,
                language: label.language,
                value: label.value,
                type: LabelType.PREF,
              },
            })
          }
        }

        // Upsert alternative labels
        // For altlabels: allow multiple values per language with upsert
        for (const label of uniqueAltLabels) {
          await this.prismaClient.conceptLabel.upsert({
            where: {
              conceptId_language_type_value: {
                conceptId: dbConcept.id,
                language: label.language,
                type: LabelType.ALT,
                value: label.value,
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
