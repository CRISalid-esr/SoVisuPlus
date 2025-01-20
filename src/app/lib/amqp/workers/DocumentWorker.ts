import { AMQPDocumentMessage } from '@/types/AMQPDocumentMessage'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
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
  ) {
    super(message)
  }

  /**
   * Process a document message by fetching data from the graph and updating the database
   */
  public async process(): Promise<void> {
    const { uid, identifiers,titles } =
      this.message.fields
    console.log(`Processing document with UID: ${uid}`)

    const transformedTitles= Object.fromEntries(
      titles.map((title) => [title.language, title.value]),
    )
 

    try {
      await this.documentDAO.createOrUpdateDocument(
        new Document(
          uid,
          transformedTitles,
        ),
      )
      console.log(`Successfully processed document: ${uid}`)
    } catch (error) {
      console.error(
        `Failed to process document message for UID: ${uid}`,
        error,
      )
      throw error
    }
  }


}
