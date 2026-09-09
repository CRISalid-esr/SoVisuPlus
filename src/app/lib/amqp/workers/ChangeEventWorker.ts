import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { AMQPChangeEventMessage } from '@/types/AMQPChangeEventMessage'
import { UserActionOutcomeEvent } from '@/types/UserActionOutcomeEvent'

/**
 * Worker for change outcome messages (`change.applied` / `change.failed`)
 * emitted by the graph after processing a user action.
 *
 * On failure no `document_updated` message will follow, so this worker is the
 * only unfreeze signal: it resets the target document's
 * `waiting_for_update` state. On success the subsequent `document_updated`
 * message re-writes the document and resets the state as today.
 */
export class ChangeEventWorker extends MessageProcessingWorker<AMQPChangeEventMessage> {
  constructor(
    message: AMQPChangeEventMessage,
    private documentDAO: DocumentDAO,
  ) {
    super(message)
  }

  public async process(): Promise<UserActionOutcomeEvent[]> {
    const { fields, event } = this.message
    if (!fields) {
      console.warn('No fields found in change event message')
      return []
    }
    const targetUid = fields.target_uid
    if (!targetUid) {
      console.warn('No target_uid found in change event message')
      return []
    }

    if (fields.target_type !== 'DOCUMENT') {
      console.warn(
        `Unsupported change event target type: ${fields.target_type}`,
      )
    } else if (event === 'failed') {
      await this.documentDAO.resetDocumentsWaitingForUpdate([targetUid])
      console.log(
        `Change ${fields.uid} failed — reset waiting state of document ${targetUid}`,
      )
    }

    // The change payload carries no document labels; enrich from the local DB
    // so the client can name the document. The target may be unknown locally
    // (the graph reports failures even for missing documents) — fall back to
    // the uid.
    let objectLabels: Record<string, string> = {}
    if (fields.target_type === 'DOCUMENT') {
      objectLabels = await this.documentDAO.getDocumentLabelsByUid(targetUid)
    }
    if (Object.keys(objectLabels).length === 0) {
      objectLabels = { ul: targetUid }
    }

    return [
      new UserActionOutcomeEvent(
        fields.id,
        event,
        fields.person_uid,
        fields.target_type,
        targetUid,
        fields.path ?? null,
        fields.action_type,
        fields.error_message ?? null,
        fields.warnings ?? [],
        objectLabels,
        fields.timestamp ?? null,
      ),
    ]
  }
}
