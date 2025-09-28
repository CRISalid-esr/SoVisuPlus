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
  constructor(
    message: AMQPDocumentMessage,
    private documentDAO: DocumentDAO,
    private documentGraphQLClient: DocumentGraphQLClient,
  ) {
    super(message)
  }

  /**
   * Process a document message by fetching data from the graph and updating the database.
   * If event === "deleted", delete the document directly (no GraphQL fetch).
   */
  public async process(): Promise<DataEvent[]> {
    const events: DataEvent[] = []

    const { fields, event } = this.message
    if (!fields) {
      console.warn('No fields found in document message')
      return events
    }
    const uid = fields.uid
    if (!uid) {
      console.warn('No UID found in document message')
      return events
    }

    try {
      if (event === 'deleted') {
        const contributorUidsFromDb =
          await this.documentDAO.getContributorUidsByDocumentUid(uid)

        await this.documentDAO.deleteDocumentByUid(uid)

        // Build a label & contributor list from the message payload (no DB/GraphQL call)
        const labelFromMessage =
          (Array.isArray(fields.titles) && fields.titles[0]?.value) || uid

        console.log(`Deleted document with UID: ${uid}`)

        events.push(
          new DataEvent(
            'Document',
            uid,
            event,
            labelFromMessage,
            contributorUidsFromDb,
          ),
        )
        return events
      }

      // Default path: (create|update|…): fetch from GraphQL then upsert
      console.log(`Processing document with UID: ${uid}`)
      const document: Document | null =
        await this.documentGraphQLClient.getDocumentByUid(uid)

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
      const label = document.getTitleInLocale(0)

      console.log(`Successfully processed document: ${uid}`)
      if (event !== 'unchanged') {
        events.push(
          new DataEvent('Document', uid, event, label, contributorUids),
        )
      }

      return events
    } catch (error) {
      console.error(`Failed to process document message for UID: ${uid}`, error)
      throw error
    }
  }
}
