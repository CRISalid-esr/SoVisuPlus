import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { AMQPHarvestingResultEventMessage } from '@/types/AMQPHarvestingResultEventMessage'
import { HarvestingResultEvent } from '@/types/HarvestingResultEvent'
import { isValidBibliographicPlatformName } from '@/types/BibliographicPlatform'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { PersonIdentifierType as DbPersonIdentifierType } from '@prisma/client'

/**
 * Worker for processing harvesting result event messages
 */
export class HarvestingResultEventWorker extends MessageProcessingWorker<AMQPHarvestingResultEventMessage> {
  /**
   * Constructor
   * @param message - The harvesting result event message to process
   */
  constructor(
    message: AMQPHarvestingResultEventMessage,
    private personDao: PersonDAO,
  ) {
    super(message)
  }

  /**
   * Process a document message by fetching data from the graph and updating the database
   */
  public async process(): Promise<HarvestingResultEvent[]> {
    const events: HarvestingResultEvent[] = []
    if (!this.message.fields) {
      console.warn('No fields found in document message')
      return events
    }
    const bibliographicPlatform = isValidBibliographicPlatformName(
      this.message.fields.reference_event.reference.harvester,
    )
    if (!bibliographicPlatform) {
      console.warn(
        `Unknown bibliographic platform: ${this.message.fields.reference_event.reference.harvester}`,
      )
      return events
    }
    const localIdentifier = this.message.fields.entity.identifiers.find(
      (identifier) => identifier.type === 'local',
    )?.value
    if (!localIdentifier) {
      console.warn('No local identifier found in entity identifiers')
      return events
    }
    const person = await this.personDao.fetchPersonByIdentifier(
      new PersonIdentifier(DbPersonIdentifierType.local, localIdentifier),
    )
    if (!person) {
      console.warn(`No person found for local identifier: ${localIdentifier}`)
      return events
    }
    events.push(
      new HarvestingResultEvent(
        bibliographicPlatform,
        person.uid,
        this.message.fields.reference_event.type,
      ),
    )

    return events
  }
}
