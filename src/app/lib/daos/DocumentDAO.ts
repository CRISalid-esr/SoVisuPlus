import { Document as DbDocument, Person as DbPerson } from '@prisma/client'
import { Document } from '@/types/Document'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { PersonDAO } from './PersonDAO'

export class DocumentDAO extends AbstractDAO {
  /**
   * Create or update a Document record in the database
   * @param document - The Document object to upsert
   * @returns The created or updated Document record
   */
  public async createOrUpdateDocument(document: Document): Promise<DbDocument> {
    const { uid, titles, contributions } = document

    try {
      const document: DbDocument = await this.prismaClient.document.upsert({
        where: { uid: uid },
        update: {
          titles: titles,
        },
        create: {
          uid: uid,
          titles: titles,
        },
      })

      for await (const contribution of contributions) {
        let person: DbPerson
        try {
          person = await new PersonDAO().createOrUpdatePerson(contribution)
        } catch (error) {
          console.error(
            `Failed to create or update person for contribution: ${contribution}`,
            error,
          )
          continue
        }

        await this.prismaClient.contribution.upsert({
          where: {
            personId_documentId_role: {
              personId: person.id,
              documentId: document.id,
              role: 'AUTHOR',
            },
          },
          update: {}, // No update is necessary here, we only need to ensure uniqueness
          create: {
            personId: person.id,
            documentId: document.id,
            role: 'AUTHOR',
          },
        })
      }

      return document
    } catch (error) {
      console.error('Error during document upsert:', error as Error)
      throw new Error(`Failed to upsert document: ${(error as Error).message}`)
    }
  }
}
