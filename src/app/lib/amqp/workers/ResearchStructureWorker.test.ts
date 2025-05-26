import { ResearchStructureWorker } from '@/lib/amqp/workers/ResearchStructureWorker'
import { AMQPResearchStructureMessage } from '@/types/AMQPResearchStructureMessage'
import { ResearchStructureDAO } from '@/lib/daos/ResearchStructureDAO'
import { ResearchStructure } from '@/types/ResearchStructure'
import { Literal } from '@/types/Literal'

jest.mock('@/lib/daos/ResearchStructureDAO', () => {
  return {
    ResearchStructureDAO: jest.fn().mockImplementation(() => {
      return {
        createOrUpdateResearchStructure: jest.fn(),
      }
    }),
  }
})

const mockDAO = new ResearchStructureDAO()

describe('ResearchStructureWorker', () => {
  let worker: ResearchStructureWorker

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should process a valid research structure message', async () => {
    const message: AMQPResearchStructureMessage = {
      type: 'research_structure',
      event: 'updated',
      fields: {
        uid: 'rs-123',
        identifiers: [
          { type: 'NNS', value: '12345' },
          { type: 'ROR', value: 'https://ror.org/01' },
        ],
        names: [{ value: 'Research Structure', language: 'en' }],
        acronym: 'RS',
        descriptions: [{ value: 'A description', language: 'en' }],
      },
    }

    worker = new ResearchStructureWorker(message, mockDAO)

    await worker.process()

    const expectedResearchStructure = new ResearchStructure(
      'rs-123',
      'RS',
      [new Literal('Research Structure', 'en')],
      [new Literal('A description', 'en')],
      [
        { type: 'NNS', value: '12345' },
        { type: 'ROR', value: 'https://ror.org/01' },
      ],
    )

    expect(mockDAO.createOrUpdateResearchStructure).toHaveBeenCalledWith(
      expectedResearchStructure,
    )
  })

  it('should log and throw an error if processing fails', async () => {
    const message: AMQPResearchStructureMessage = {
      type: 'research_structure',
      event: 'updated',
      fields: {
        uid: 'rs-123',
        identifiers: [{ type: 'NNS', value: '12345' }],
        names: [{ value: 'Research Structure', language: 'en' }],
        acronym: 'RS',
        descriptions: [{ value: 'A description', language: 'en' }],
      },
    }

    worker = new ResearchStructureWorker(message, mockDAO)
    ;(mockDAO.createOrUpdateResearchStructure as jest.Mock).mockRejectedValue(
      new Error('Database error'),
    )

    await expect(worker.process()).rejects.toThrow('Database error')

    const expectedResearchStructure = new ResearchStructure(
      'rs-123',
      'RS',
      [new Literal('Research Structure', 'en')],
      [new Literal('A description', 'en')],
      [{ type: 'NNS', value: '12345' }],
    )

    expect(mockDAO.createOrUpdateResearchStructure).toHaveBeenCalledWith(
      expectedResearchStructure,
    )
  })

  it('should throw an error if an invalid identifier type is provided', async () => {
    const message: AMQPResearchStructureMessage = {
      type: 'research_structure',
      event: 'updated',
      fields: {
        uid: 'rs-123',
        identifiers: [{ type: 'INVALID', value: '12345' }],
        names: [{ value: 'Research Structure', language: 'en' }],
        acronym: 'RS',
        descriptions: [{ value: 'A description', language: 'en' }],
      },
    }

    worker = new ResearchStructureWorker(message, mockDAO)

    await expect(worker.process()).rejects.toThrow(
      'Unsupported identifier type: INVALID',
    )
  })
})
