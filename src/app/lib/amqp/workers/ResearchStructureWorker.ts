import { AMQPResearchStructureMessage } from '@/types/AMQPResearchStructureMessage'
import { ResearchStructureDAO } from '@/lib/daos/ResearchStructureDAO'
import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'

/**
 * Worker for processing research structure-related messages
 */
export class ResearchStructureWorker extends MessageProcessingWorker<AMQPResearchStructureMessage> {
  private researchStructureDAO: ResearchStructureDAO

  /**
   * Constructor
   * @param message - The research structure message to process
   */
  constructor(
    message: AMQPResearchStructureMessage,
    researchStructureDAO: ResearchStructureDAO,
  ) {
    super(message)
    this.researchStructureDAO = researchStructureDAO
  }

  /**
   * Process a research structure message by fetching data from the graph and updating the database
   */
  public async process(): Promise<void> {
    const { uid, identifiers, names, acronym, descriptions } =
      this.message.fields
    console.log(`Processing research structure with UID: ${uid}`)

    const transformedNames = Object.fromEntries(
      names.map((name) => [name.language, name.value]),
    )
    const transformedDescriptions = Object.fromEntries(
      descriptions.map((description) => [
        description.language,
        description.value,
      ]),
    )

    try {
      await this.researchStructureDAO.createOrUpdateResearchStructure({
        uid,
        identifiers,
        names: transformedNames,
        acronym,
        descriptions: transformedDescriptions,
      })
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
