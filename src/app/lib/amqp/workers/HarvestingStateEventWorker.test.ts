import { HarvestingStateEventWorker } from '@/lib/amqp/workers/HarvestingStateEventWorker'
import { AMQPHarvestingStateEventMessage } from '@/types/AMQPHarvestingStateEventMessage'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { HarvestingStateEvent } from '@/types/HarvestingStateEvent'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { PersonIdentifierType as DbPersonIdentifierType } from '@prisma/client'

// Mocks
jest.mock('@/lib/daos/PersonDAO')

describe('HarvestingStateEventWorker', () => {
  let personDAO: jest.Mocked<PersonDAO>

  beforeEach(() => {
    personDAO = new PersonDAO() as jest.Mocked<PersonDAO>
  })

  it('should produce a HarvestingStateEvent from a valid message', async () => {
    const mockMessage: AMQPHarvestingStateEventMessage = {
      type: 'harvesting_state_event',
      event: 'running',
      fields: {
        harvester: 'hal',
        state: 'running',
        error: [],
        entity: {
          identifiers: [
            { type: 'local', value: 'user-001' },
            { type: 'idref', value: '999999' },
          ],
          name: 'John Doe',
        },
      },
    }

    const mockPerson = new Person(
      'user-001',
      false,
      'john.doe@example.com',
      'John Doe',
      'John',
      'Doe',
      [
        new PersonIdentifier(DbPersonIdentifierType.local, 'user-001'),
        new PersonIdentifier(DbPersonIdentifierType.idref, '999999'),
      ],
      [],
    )

    personDAO.fetchPersonByIdentifier.mockResolvedValue(mockPerson)

    const worker = new HarvestingStateEventWorker(mockMessage, personDAO)
    const events = await worker.process()

    expect(events).toHaveLength(1)
    expect(events[0]).toBeInstanceOf(HarvestingStateEvent)
    expect(events[0].platform).toBe(BibliographicPlatform.HAL)
    expect(events[0].personUid).toBe('user-001')
    expect(events[0].state).toBe('running')

    expect(personDAO.fetchPersonByIdentifier).toHaveBeenCalledWith({
      type: DbPersonIdentifierType.local,
      value: 'user-001',
    })
  })
})
