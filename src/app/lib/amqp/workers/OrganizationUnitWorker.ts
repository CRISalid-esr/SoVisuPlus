import { AMQPOrganizationUnitMessage } from '@/types/AMQPOrganizationUnitMessage'
import { OrganizationUnitDAO } from '@/lib/daos/OrganizationUnitDAO'
import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import {
  OrganizationUnitIdentifier,
  organizationIdentifierTypeFromString,
} from '@/types/OrganizationUnitIdentifier'
import { Literal } from '@/types/Literal'
import { DataEvent } from '@/types/DataEvent'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'

const CATEGORY_BY_MISSION: Record<string, OrganizationCategory> = {
  research: OrganizationCategory.research_unit,
  scientific_services: OrganizationCategory.support_unit,
  administrative_services: OrganizationCategory.administrative_unit,
  teaching: OrganizationCategory.teaching_unit,
}

/**
 * Worker for processing organization structure messages
 */
export class OrganizationUnitWorker extends MessageProcessingWorker<AMQPOrganizationUnitMessage> {
  /**
   * Constructor
   * @param message - The organization unit message to process
   */
  constructor(
    message: AMQPOrganizationUnitMessage,
    private organizationUnitDAO: OrganizationUnitDAO,
  ) {
    super(message)
  }

  /**
   * Process an organization unit message by updating the database
   */
  public async process(): Promise<DataEvent[]> {
    const events: DataEvent[] = []
    const {
      uid,
      identifiers,
      long_labels,
      short_labels,
      descriptions,
      local_types,
      national_type,
      main_mission,
    } = this.message.fields
    console.log(`Processing organization unit with UID: ${uid}`)

    const acronym = short_labels?.[0]?.value ?? null

    const genericType = this.message.type as OrganizationGenericType
    const category =
      genericType === 'unit'
        ? (CATEGORY_BY_MISSION[main_mission ?? ''] ??
          OrganizationCategory.research_unit)
        : (genericType as unknown as OrganizationCategory)

    const transformedIdentifiers: OrganizationUnitIdentifier[] =
      identifiers.map((identifier) => {
        return {
          type: organizationIdentifierTypeFromString(identifier.type),
          value: identifier.value,
        }
      })

    try {
      await this.organizationUnitDAO.createOrUpdateOrganizationUnit(
        new OrganizationUnit(
          uid,
          acronym,
          (long_labels ?? []) as Literal[],
          (descriptions ?? []) as Literal[],
          category,
          genericType,
          national_type ?? null,
          transformedIdentifiers,
          null,
          false,
          (local_types ?? []) as Literal[],
        ),
      )
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
