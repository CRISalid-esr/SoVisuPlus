import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { SourcePerson } from '@/types/SourcePerson'
import { SourcePersonIdentifier } from '@/types/SourcePersonIdentifier'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

/** SourcePersonDAO: Handles operations related to SourcePerson and SourcePersonIdentifiers */
export class SourcePersonDAO extends AbstractDAO {
  /**
   * Create or update a single source person, optionally linked to a person
   * @param sourcePerson - The source person to upsert
   * @param personId - The ID of the person the record belongs to, if any
   */
  public async createOrUpdateSourcePerson(
    sourcePerson: SourcePerson,
    personId?: number,
  ): Promise<void> {
    try {
      // Only touch the person relation when a personId is provided, so an
      // unrelated source person keeps (or stays without) its link.
      const personRelation = personId
        ? { connect: { id: personId } }
        : undefined

      const dbSourcePerson = await this.prismaClient.sourcePerson.upsert({
        where: { uid: sourcePerson.uid },
        update: {
          name: sourcePerson.name,
          source: sourcePerson.source,
          sourceId: sourcePerson.sourceId,
          person: personRelation,
        },
        create: {
          uid: sourcePerson.uid,
          name: sourcePerson.name,
          source: sourcePerson.source,
          sourceId: sourcePerson.sourceId,
          person: personRelation,
        },
      })

      await this.upsertIdentifiers(
        sourcePerson.getIdentifiers(),
        dbSourcePerson.id,
      )
    } catch (error) {
      console.error('Error during source person upsert:', error)
      throw new Error(
        `Failed to upsert source person: ${(error as unknown as Error).message}`,
      )
    }
  }

  /**
   * Upsert SourcePersonIdentifiers for a given source person.
   *
   * Identifiers have a many-to-many relation with source persons and are
   * globally unique on (type, value), so we replace the source person's
   * current links and connect or create each identifier by that unique key.
   * @param identifiers - The list of identifiers to upsert
   * @param sourcePersonId - The ID of the source person
   * @param retries - The number of retries (to handle conflicts on upsert)
   */
  private async upsertIdentifiers(
    identifiers: SourcePersonIdentifier[],
    sourcePersonId: number,
    retries = 0,
  ): Promise<void> {
    try {
      await this.prismaClient.sourcePerson.update({
        where: { id: sourcePersonId },
        data: {
          identifiers: {
            set: [], // Drop the existing links before reconnecting
            connectOrCreate: identifiers.map((identifier) => ({
              where: {
                type_value: {
                  type: identifier.type,
                  value: identifier.value,
                },
              },
              create: {
                type: identifier.type,
                value: identifier.value,
              },
            })),
          },
        },
      })
    } catch (error: unknown) {
      console.error('Error during identifier upsert:', error as Error)
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        if (retries < 3) {
          console.warn('Retrying identifier upsert...')
          await this.upsertIdentifiers(identifiers, sourcePersonId, retries + 1)
        } else {
          console.error('Failed to upsert identifiers after 3 retries')
        }
      } else {
        throw new Error(
          `Failed to upsert identifiers: ${(error as Error).message}`,
        )
      }
    }
  }
}
