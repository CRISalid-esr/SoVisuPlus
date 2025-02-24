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

        // 1. Fetch all existing labels for the concept
        const existingLabels = await this.prismaClient.conceptLabel.findMany({
          where: { conceptId: dbConcept.id },
        })

        // 2. For preflabels, determine obsolete labels (one per language)
        const providedPrefLanguages = new Set(
          uniquePrefLabels.map((label) => label.language?.toString()),
        )
        const obsoletePrefLabels = existingLabels.filter(
          (label) =>
            label.type === LabelType.PREF &&
            !providedPrefLanguages.has(label.language.toString()),
        )

        // Delete obsolete preflabels
        for (const label of obsoletePrefLabels) {
          await this.prismaClient.conceptLabel.delete({
            where: { id: label.id },
          })
        }

        // 3. For altlabels, determine obsolete labels (match by language and value)
        const providedAltSet = new Set(
          uniqueAltLabels.map((label) => `${label.language}:${label.value}`),
        )
        const obsoleteAltLabels = existingLabels.filter(
          (label) =>
            label.type === LabelType.ALT &&
            !providedAltSet.has(`${label.language}:${label.value}`),
        )

        // Delete obsolete altlabels
        for (const label of obsoleteAltLabels) {
          await this.prismaClient.conceptLabel.delete({
            where: { id: label.id },
          })
        }

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
