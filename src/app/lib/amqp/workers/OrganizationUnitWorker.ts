import { AMQPOrganizationUnitMessage } from '@/types/AMQPOrganizationUnitMessage'
import { OrganizationUnitDAO } from '@/lib/daos/OrganizationUnitDAO'
import { OrganizationUnitGraphQLClient } from '@/lib/graphql/OrganizationUnitGraphQLClient'
import { OrganizationUnitService } from '@/lib/services/OrganizationUnitService'
import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { DataEvent } from '@/types/DataEvent'

/**
 * Worker for processing organization structure messages.
 *
 * The message is only a trigger: the authoritative data (including the
 * concrete type carried by the graph labels and the part_of/member_of
 * relationships) is fetched from the graph GraphQL API, as PersonWorker
 * does for people.
 */
export class OrganizationUnitWorker extends MessageProcessingWorker<AMQPOrganizationUnitMessage> {
  /**
   * Constructor
   * @param message - The organization unit message to process
   * @param organizationUnitDAO - DAO used to persist the structure
   * @param organizationUnitGraphQLClient - graph GraphQL client
   * @param organizationUnitService - service owning the visibility cascade
   */
  constructor(
    message: AMQPOrganizationUnitMessage,
    private organizationUnitDAO: OrganizationUnitDAO,
    private organizationUnitGraphQLClient: OrganizationUnitGraphQLClient,
    private organizationUnitService: OrganizationUnitService,
  ) {
    super(message)
  }

  /**
   * Process an organization unit message by fetching data from the graph
   * and updating the database.
   */
  public async process(): Promise<DataEvent[]> {
    const events: DataEvent[] = []
    const { uid } = this.message.fields

    if (this.message.event === 'deleted') {
      // The graph does not delete organization nodes for now; structure
      // lifecycle will be handled in a later issue.
      console.log(`Ignoring deleted event for organization unit: ${uid}`)
      return events
    }

    console.log(`Processing organization unit with UID: ${uid}`)

    try {
      const organizationUnit =
        await this.organizationUnitGraphQLClient.getOrganizationUnitByUid(uid)

      if (!organizationUnit) {
        console.error(
          `Organization unit ${uid} not found in the graph, skipping`,
        )
        return events
      }

      await this.organizationUnitDAO.createOrUpdateOrganizationUnit(
        organizationUnit,
      )
      // The parent relationships were just replaced, and the hidden cascade
      // is derived from them.
      await this.organizationUnitService.recomputeEffectiveHidden()
      console.log(`Successfully processed organization unit: ${uid}`)
    } catch (error) {
      console.error(
        `Failed to process organization unit message for UID: ${uid}`,
        error,
      )
      throw error
    }
    return events
  }
}
