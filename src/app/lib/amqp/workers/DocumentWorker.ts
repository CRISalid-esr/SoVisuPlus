import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { DocumentGraphQLClient } from '@/lib/graphql/DocumentGraphQLClient'
import { AMQPDocumentMessage } from '@/types/AMQPDocumentMessage'
import { Document } from '@/types/Document'
/**
 * Worker for processing document messages
 */
export class DocumentWorker extends MessageProcessingWorker<AMQPDocumentMessage> {
  /**
   * Constructor
   * @param message - The document message to process
   */
  constructor(
    message: AMQPDocumentMessage,
    private documentDAO: DocumentDAO,
    private documentGraphQLClient: DocumentGraphQLClient,
  ) {
    super(message)
  }

  /**
   * Process a document message by fetching data from the graph and updating the database
   */
  public async process(): Promise<void> {
    if (!this.message.fields) {
      console.warn('No fields found in document message')
      return
    }
    const { uid } = this.message.fields

    if (!uid) {
      console.warn('No UID found in document message')
      return
    }
    console.log(`Processing document with UID: ${uid}`)

    const document: Document | null =
      await this.documentGraphQLClient.getDocumentByUid(uid)

    try {
      if (!document) {
        console.warn(`No document data found for UID: ${uid}`)
        return
      }
      await this.documentDAO.createOrUpdateDocument(document)
      return
    } catch (error) {
      console.error(`Failed to process document message for UID: ${uid}`, error)
      throw error
    }
  }
}
