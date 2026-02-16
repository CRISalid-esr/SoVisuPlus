import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { AMQPHarvestingStateEventMessage } from '@/types/AMQPHarvestingStateEventMessage'
import {
  HarvestingStateEvent,
  isHarvestingState,
} from '@/types/HarvestingStateEvent'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { isValidBibliographicPlatformName } from '@/types/BibliographicPlatform'

/**
 * Worker for processing harvesting state event messages
 */
export class HarvestingStateEventWorker extends MessageProcessingWorker<AMQPHarvestingStateEventMessage> {
  /**
   * Constructor
   * @param message - The harvesting state event message to process
   */
  constructor(
    message: AMQPHarvestingStateEventMessage,
    private personDAO: PersonDAO,
  ) {
    super(message)
  }

  /**
   * Process a document message by fetching data from the graph and updating the database
   */
  public async process(): Promise<HarvestingStateEvent[]> {
    const events: HarvestingStateEvent[] = []
    if (!this.message.fields) {
      console.warn('No fields found in document message')
      return events
    }
    const bibliographicPlatform = isValidBibliographicPlatformName(
      this.message.fields.harvester,
    )
    if (!bibliographicPlatform) {
      console.warn(
        `Unknown bibliographic platform: ${this.message.fields.harvester}`,
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
    const person = await this.personDAO.fetchPersonByIdentifier(
      new PersonIdentifier(PersonIdentifierType.local, localIdentifier),
    )
    if (!person) {
      console.warn(`No person found for local identifier: ${localIdentifier}`)
      return events
    }
    const state = this.message.fields.state
    if (!state) {
      console.warn('No state found in harvesting state event message')
      return events
    }

    if (!isHarvestingState(state)) {
      console.warn(`Invalid harvesting state: ${state}`)
      return events
    }
    events.push(
      new HarvestingStateEvent(bibliographicPlatform, person.uid, state),
    )

    return events
  }
}
