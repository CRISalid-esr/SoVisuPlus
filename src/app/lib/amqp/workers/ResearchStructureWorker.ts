import { AMQPResearchStructureMessage } from '@/types/AMQPResearchStructureMessage'
import { ResearchStructureDAO } from '@/lib/daos/ResearchStructureDAO'
import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { ResearchStructure } from '@/types/ResearchStructure'
import {
  convertStringResearchStructureIdentifierType,
  ResearchStructureIdentifier,
} from '@/types/ResearchStructureIdentifier'
import { Literal } from '@/types/Literal'

/**
 * Worker for processing research structure-related messages
 */
export class ResearchStructureWorker extends MessageProcessingWorker<AMQPResearchStructureMessage> {
  /**
   * Constructor
   * @param message - The research structure message to process
   */
  constructor(
    message: AMQPResearchStructureMessage,
    private researchStructureDAO: ResearchStructureDAO,
  ) {
    super(message)
  }

  /**
   * Process a research structure message by fetching data from the graph and updating the database
   */
  public async process(): Promise<void> {
    const { uid, identifiers, names, acronym, descriptions } =
      this.message.fields
    console.log(`Processing research structure with UID: ${uid}`)

    const transformedIdentifiers: ResearchStructureIdentifier[] =
      identifiers.map((identifier) => {
        return {
          type: convertStringResearchStructureIdentifierType(identifier.type),
          value: identifier.value,
        }
      })

    try {
      await this.researchStructureDAO.createOrUpdateResearchStructure(
        new ResearchStructure(
          uid,
          acronym,
          names as Literal[],
          descriptions as Literal[],
          transformedIdentifiers,
        ),
      )
      console.log(`Successfully processed research structure: ${uid}`)
    } catch (error) {
      console.error(
        `Failed to process research structure message for UID: ${uid}`,
        error,
      )
      throw error
    }
  }
}
