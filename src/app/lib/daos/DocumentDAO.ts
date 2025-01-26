import { DocumentWithRelations as DbDocument } from '@/prisma-schema/extended-client'
import { Person as DbPerson } from '@prisma/client'
import { Document } from '@/types/Document'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { PersonDAO } from './PersonDAO'

export class DocumentDAO extends AbstractDAO {
  /**
   * Create or update a Document record in the database
   * @param document - The Document object to create or update
   * @returns The created or updated Document record
   */
  public async createOrUpdateDocument(document: Document): Promise<DbDocument> {
    const { uid, titles, abstracts, contributions } = document

    try {
      let dbDocument = await this.prismaClient.document.findUnique({
        where: { uid: uid },
      })

      if (!dbDocument) {
        dbDocument = await this.prismaClient.document.create({
          data: { uid: uid },
        })
      }

      for (const title of titles) {
        await this.prismaClient.documentTitle.upsert({
          where: {
            documentId_language: {
              documentId: dbDocument.id,
              language: title.language ?? null,
            },
          },
          update: {
            value: title.value,
          },
          create: {
            documentId: dbDocument.id,
            language: title.language ?? null,
            value: title.value,
          },
        })
      }
      for (const abstract of abstracts) {
        await this.prismaClient.documentAbstract.upsert({
          where: {
            documentId_language: {
              documentId: dbDocument.id,
              language: abstract.language ?? null,
            },
          },
          update: {
            value: abstract.value,
          },
          create: {
            documentId: dbDocument.id,
            language: abstract.language ?? null,
            value: abstract.value,
          },
        })
      }

      for (const contribution of contributions) {
        let person: DbPerson
        try {
          person = await new PersonDAO().createOrUpdatePerson(contribution)
        } catch (error) {
          console.error(
            `Failed to create or update person for contribution: ${contribution}`,
            error,
          )
          // don't discard the whole document if a person fails to create/update
          // just skip this contribution
          continue
        }

        const { id: personId } = person
        const { id: documentId } = dbDocument
        await this.prismaClient.contribution.create({
          data: {
            personId,
            documentId,
            role: 'AUTHOR', // You can dynamically determine the role if necessary
          },
        })
      }

      return dbDocument
    } catch (error) {
      console.error('Error during document creation or update:', error as Error)
      throw new Error(
        `Failed to create or update document: ${(error as Error).message}`,
      )
    }
  }
}
