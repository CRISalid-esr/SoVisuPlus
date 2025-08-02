import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { DocumentGraphQLClient } from '@/lib/graphql/DocumentGraphQLClient'
import { AMQPDocumentMessage } from '@/types/AMQPDocumentMessage'
import { Document } from '@/types/Document'
import { DataEvent } from '@/types/DataEvent'

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
  public async process(): Promise<DataEvent[]> {
    const events: DataEvent[] = []
    if (!this.message.fields) {
      console.warn('No fields found in document message')
      return events
    }
    const { uid } = this.message.fields

    if (!uid) {
      console.warn('No UID found in document message')
      return events
    }
    console.log(`Processing document with UID: ${uid}`)

    const document: Document | null =
      await this.documentGraphQLClient.getDocumentByUid(uid)

    try {
      if (!document) {
        console.warn(`No document data found for UID: ${uid}`)
        return events
      }
      const dbDocument = await this.documentDAO.createOrUpdateDocument(document)
      if (!dbDocument) {
        console.warn(
          `Failed to create or update document in DB for UID: ${uid}`,
        )
        return events
      }
      const contributorUids = document.contributions.map(
        (contribution) => contribution.person.uid,
      )
      console.log(`Successfully processed document: ${uid}`)
      const label = document.getTitleInLocale(0)
      events.push(
        new DataEvent(
          'Document',
          uid,
          this.message.event,
          label,
          contributorUids,
        ),
      )

      return events
    } catch (error) {
      console.error(`Failed to process document message for UID: ${uid}`, error)
      throw error
    }
  }
}
