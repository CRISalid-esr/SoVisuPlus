import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { DocumentGraphQLClient } from '@/lib/graphql/DocumentGraphQLClient'
import { AMQPDocumentMessage } from '@/types/AMQPDocumentMessage'
import { Document } from '@/types/Document'
import { DataEvent } from '@/types/DataEvent'
import { Literal } from '@/types/Literal'

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
   * Convert an array of Literals to objectLabels.
   * - Uses the literal's language as the key and its value as the label.
   * - If empty, fallback to `{ ul: fallback }`.
   */
  private buildObjectLabelsFromLiterals(
    titles: Literal[] | undefined,
    fallback: string,
  ): Record<string, string> {
    const labels: Record<string, string> = {}

    if (Array.isArray(titles)) {
      for (const t of titles) {
        if (t && t.value && t.language) {
          labels[t.language] = t.value
        }
      }
    }

    if (Object.keys(labels).length === 0) {
      labels.ul = fallback
    }
    return labels
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
    console.log(`Processing document with UID: ${uid}`)
    try {
      // If the document was deleted, we won't find it in the GraphQL API.
      // Instead, delete it directly from the DB and build objectLabels from the message payload.
      if (event === 'deleted') {
        const contributorUidsFromDb =
          await this.documentDAO.getContributorUidsByDocumentUid(uid)

        await this.documentDAO.deleteDocumentByUid(uid)

        // Send all languages to the client to allow it to show the label in the current UI language.
        const objectLabels = this.buildObjectLabelsFromLiterals(
          fields.titles as Literal[] | undefined,
          uid,
        )

        console.log(`Deleted document with UID: ${uid}`)

        events.push(
          new DataEvent(
            'Document',
            uid,
            event,
            objectLabels,
            contributorUidsFromDb,
          ),
        )
        return events
      }

      // For created/updated/unchanged events, fetch the latest document data from the GraphQL API

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

      // Send all languages to the client to allow it to show the label in the current UI language.
      const objectLabels = this.buildObjectLabelsFromLiterals(
        document.titles as Literal[] | undefined,
        uid,
      )

      console.log(`Successfully processed document: ${uid}`)
      if (event !== 'unchanged') {
        events.push(
          new DataEvent('Document', uid, event, objectLabels, contributorUids),
        )
      }

      return events
    } catch (error) {
      console.error(`Failed to process document message for UID: ${uid}`, error)
      throw error
    }
  }
}
