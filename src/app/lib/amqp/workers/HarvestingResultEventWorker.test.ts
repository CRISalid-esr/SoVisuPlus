import { HarvestingResultEventWorker } from '@/lib/amqp/workers/HarvestingResultEventWorker'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { Person } from '@/types/Person'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { AMQPHarvestingResultEventMessage } from '@/types/AMQPHarvestingResultEventMessage'
import { HarvestingResultEvent } from '@/types/HarvestingResultEvent'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'

jest.mock('@/lib/daos/PersonDAO')

describe('HarvestingResultEventWorker', () => {
  let personDAO: jest.Mocked<PersonDAO>

  beforeEach(() => {
    personDAO = new PersonDAO() as jest.Mocked<PersonDAO>
  })

  it('should produce a HarvestingResultEvent from a valid message', async () => {
    const message: AMQPHarvestingResultEventMessage = {
      type: 'harvesting_result_event',
      event: 'created',
      fields: {
        reference_event: {
          type: 'updated',
          reference: {
            source_identifier: 'source-123',
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
          identifiers: [
            { type: 'local', value: 'person-123' },
            { type: 'idref', value: '999999' },
          ],
          name: 'John Doe',
        },
      },
    }

    const mockPerson = new Person(
      'person-123',
      false,
      'john.doe@example.com',
      'John Doe',
      'John',
      'Doe',
      [
        new PersonIdentifier(PersonIdentifierType.local, 'person-123'),
        new PersonIdentifier(PersonIdentifierType.idref, '999999'),
      ],
    )

    personDAO.fetchPersonByIdentifier.mockResolvedValue(mockPerson)

    const worker = new HarvestingResultEventWorker(message, personDAO)
    const events = await worker.process()

    expect(events).toHaveLength(1)
    const event = events[0]

    expect(event).toBeInstanceOf(HarvestingResultEvent)
    expect(event.platform).toBe(BibliographicPlatform.HAL)
    expect(event.personUid).toBe('person-123')
    expect(event.status).toBe('updated')

    expect(personDAO.fetchPersonByIdentifier).toHaveBeenCalledWith({
      type: PersonIdentifierType.local,
      value: 'person-123',
    })
  })
})
