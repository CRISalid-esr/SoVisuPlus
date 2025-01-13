import { MessageProcessingWorkerFactory } from '@/lib/amqp/workers/MessageProcessingWorkerFactory'
import { PersonWorker } from '@/lib/amqp/workers/PersonWorker'
import { ResearchStructureWorker } from '@/lib/amqp/workers/ResearchStructureWorker'
import { AMQPPersonMessage } from '@/types/AMQPPersonMessage'
import { AMQPResearchStructureMessage } from '@/types/AMQPResearchStructureMessage'

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
        identifiers: [{ type: 'RNSR', value: '12345' }],
      },
    }

    const worker = factory.createWorker(message)

    expect(worker).toBeInstanceOf(ResearchStructureWorker)
  })
})
