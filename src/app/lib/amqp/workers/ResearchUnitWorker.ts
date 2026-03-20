import { AMQPResearchUnitMessage } from '@/types/AMQPResearchUnitMessage'
import { ResearchUnitDAO } from '@/lib/daos/ResearchUnitDAO'
import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { ResearchUnit } from '@/types/ResearchUnit'
import {
  ResearchUnitIdentifier,
  researchUnitIdentifierTypeFromString,
} from '@/types/ResearchUnitIdentifier'
import { Literal } from '@/types/Literal'
import { DataEvent } from '@/types/DataEvent'

/**
 * Worker for processing research unit-related messages
 */
export class ResearchUnitWorker extends MessageProcessingWorker<AMQPResearchUnitMessage> {
  /**
   * Constructor
   * @param message - The research unit message to process
   */
  constructor(
    message: AMQPResearchUnitMessage,
    private researchUnitDAO: ResearchUnitDAO,
  ) {
    super(message)
  }

  /**
   * Process a research unit message by fetching data from the graph and updating the database
   */
  public async process(): Promise<DataEvent[]> {
    const events: DataEvent[] = []
    const { uid, identifiers, names, acronym, descriptions, signature } =
      this.message.fields
    console.log(`Processing research unit with UID: ${uid}`)

    const transformedIdentifiers: ResearchUnitIdentifier[] = identifiers.map(
      (identifier) => {
        return {
          type: researchUnitIdentifierTypeFromString(identifier.type),
          value: identifier.value,
        }
      },
    )

    try {
      await this.researchUnitDAO.createOrUpdateResearchUnit(
        new ResearchUnit(
          uid,
          acronym,
          names as Literal[],
          descriptions as Literal[],
          signature,
          transformedIdentifiers,
        ),
      )
      console.log(`Successfully processed research unit: ${uid}`)
    } catch (error) {
      console.error(
        `Failed to process research unit message for UID: ${uid}`,
        error,
      )
      throw error
    }
    return events
  }
}
