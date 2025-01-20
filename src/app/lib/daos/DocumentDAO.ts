import { Document as DbDocument } from '@prisma/client'
import { Document } from '@/types/Document'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'

export class DocumentDAO extends AbstractDAO {
  /**
   * Create or update a Document record in the database
   * @param document - The Document object to upsert
   * @returns The created or updated Document record
   */
  public async createOrUpdateDocument(document: Document): Promise<DbDocument> {
    try {
      const dbDocument: DbDocument = await this.prismaClient.document.upsert({
        where: { uid: document.uid },
        update: {
          titles: document.titles,
        },
        create: {
          uid: document.uid,
          titles: document.titles,
        },
      })

      return dbDocument
    } catch (error) {
      console.error('Error during document upsert:', error as Error)
      throw new Error(`Failed to upsert document: ${(error as Error).message}`)
    }
  }
}
