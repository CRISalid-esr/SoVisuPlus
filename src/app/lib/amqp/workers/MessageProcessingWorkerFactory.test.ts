import { MessageProcessingWorkerFactory } from '@/lib/amqp/workers/MessageProcessingWorkerFactory'
import { PersonWorker } from '@/lib/amqp/workers/PersonWorker'
import { ResearchStructureWorker } from '@/lib/amqp/workers/ResearchStructureWorker'
import { AMQPPersonMessage } from '@/types/AMQPPersonMessage'
import { AMQPResearchStructureMessage } from '@/types/AMQPResearchStructureMessage'
import { DocumentWorker } from '@/lib/amqp/workers/DocumentWorker'
import { HarvestingStateEventWorker } from '@/lib/amqp/workers/HarvestingStateEventWorker'
import { HarvestingResultEventWorker } from '@/lib/amqp/workers/HarvestingResultEventWorker'

import { AMQPDocumentMessage } from '@/types/AMQPDocumentMessage'
import { AMQPHarvestingStateEventMessage } from '@/types/AMQPHarvestingStateEventMessage'
import { AMQPHarvestingResultEventMessage } from '@/types/AMQPHarvestingResultEventMessage'
import { AMQPMessage } from '@/types/AMQPMessage'

describe('MessageProcessingWorkerFactory', () => {
  let factory: MessageProcessingWorkerFactory

  beforeEach(() => {
    factory = new MessageProcessingWorkerFactory()
  })

  it('should create a PersonWorker for person messages', () => {
    const message: AMQPPersonMessage = {
      type: 'person',
      event: 'updated',
      fields: {
        uid: 'person-123',
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'John Doe',
        external: false,
        memberships: [],
        identifiers: [],
      },
    }

    const worker = factory.createWorker(message)

    expect(worker).toBeInstanceOf(PersonWorker)
  })

  it('should create a ResearchStructureWorker for research_structure messages', () => {
    const message: AMQPResearchStructureMessage = {
      type: 'research_structure',
      event: 'updated',
      fields: {
        uid: 'rs-123',
        acronym: 'RS',
        names: [{ value: 'Research Structure', language: 'en' }],
        descriptions: [{ value: 'A description', language: 'en' }],
        identifiers: [{ type: 'NNS', value: '12345' }],
      },
    }

    const worker = factory.createWorker(message)

    expect(worker).toBeInstanceOf(ResearchStructureWorker)
  })

  it('should create a DocumentWorker for document messages', () => {
    const message: AMQPDocumentMessage = {
      type: 'document',
      event: 'updated',
      fields: {
        uid: 'doc-123',
        titles: [],
        identifiers: [],
      },
    }

    const worker = factory.createWorker(message)
    expect(worker).toBeInstanceOf(DocumentWorker)
  })

  it('should create a HarvestingStateEventWorker for harvesting_state_event messages', () => {
    const message: AMQPHarvestingStateEventMessage = {
      type: 'harvesting_state_event',
      event: 'running',
      fields: {
        harvester: 'hal',
        state: 'running',
        error: [],
        entity: {
          identifiers: [{ type: 'idref', value: '123456' }],
          name: 'Jane Smith',
        },
      },
    }

    const worker = factory.createWorker(message)
    expect(worker).toBeInstanceOf(HarvestingStateEventWorker)
  })

  it('should create a HarvestingResultEventWorker for harvesting_result_event messages', () => {
    const message: AMQPHarvestingResultEventMessage = {
      type: 'harvesting_result_event',
      event: 'created',
      fields: {
        reference_event: {
          type: 'created',
          reference: {
            source_identifier: 'source-1',
            harvester: 'hal',
            harvester_version: '1.0.0',
            identifiers: [],
            manifestations: [],
            titles: [],
            subtitles: [],
            abstracts: [],
            subjects: [],
            document_type: [],
            contributions: [],
            issue: null,
            page: null,
            book: null,
            raw_issued: null,
            issued: null,
            created: null,
            custom_metadata: null,
            version: 1,
          },
          enhanced: false,
        },
        entity: {
          identifiers: [{ type: 'idref', value: '123456' }],
          name: 'John Doe',
        },
      },
    }

    const worker = factory.createWorker(message)
    expect(worker).toBeInstanceOf(HarvestingResultEventWorker)
  })

  it('should throw an error for unknown message type', () => {
    const message = {
      type: 'unknown_type',
      event: 'created',
      fields: {},
    }

    expect(() =>
      factory.createWorker(message as unknown as AMQPMessage),
    ).toThrowError(/Unsupported message type/)
  })
})
