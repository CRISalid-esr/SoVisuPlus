import { ResearchUnitWorker } from '@/lib/amqp/workers/ResearchUnitWorker'
import { AMQPResearchUnitMessage } from '@/types/AMQPResearchUnitMessage'
import { ResearchUnitDAO } from '@/lib/daos/ResearchUnitDAO'
import { ResearchUnit } from '@/types/ResearchUnit'
import { Literal } from '@/types/Literal'

jest.mock('@/lib/daos/ResearchUnitDAO', () => {
  return {
    ResearchUnitDAO: jest.fn().mockImplementation(() => {
      return {
        createOrUpdateResearchUnit: jest.fn(),
      }
    }),
  }
})

const mockDAO = new ResearchUnitDAO()

describe('ResearchUnitWorker', () => {
  let worker: ResearchUnitWorker

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should process a valid research unit message', async () => {
    const message: AMQPResearchUnitMessage = {
      type: 'research_unit',
      event: 'updated',
      fields: {
        uid: 'rs-123',
        identifiers: [
          { type: 'nns', value: '12345' },
          { type: 'ror', value: 'https://ror.org/01' },
        ],
        names: [{ value: 'Research Unit', language: 'en' }],
        acronym: 'RS',
        descriptions: [{ value: 'A description', language: 'en' }],
        signature: 'RS_signature',
      },
    }

    worker = new ResearchUnitWorker(message, mockDAO)

    await worker.process()

    const expectedResearchUnit = new ResearchUnit(
      'rs-123',
      'RS',
      [new Literal('Research Unit', 'en')],
      [new Literal('A description', 'en')],
      'RS_signature',
      [
        { type: 'nns', value: '12345' },
        { type: 'ror', value: 'https://ror.org/01' },
      ],
    )

    expect(mockDAO.createOrUpdateResearchUnit).toHaveBeenCalledWith(
      expectedResearchUnit,
    )
  })

  it('should log and throw an error if processing fails', async () => {
    const message: AMQPResearchUnitMessage = {
      type: 'research_unit',
      event: 'updated',
      fields: {
        uid: 'rs-123',
        identifiers: [{ type: 'nns', value: '12345' }],
        names: [{ value: 'Research Unit', language: 'en' }],
        acronym: 'RS',
        descriptions: [{ value: 'A description', language: 'en' }],
        signature: 'RS_signature',
      },
    }

    worker = new ResearchUnitWorker(message, mockDAO)
    ;(mockDAO.createOrUpdateResearchUnit as jest.Mock).mockRejectedValue(
      new Error('Database error'),
    )

    await expect(worker.process()).rejects.toThrow('Database error')

    const expectedResearchUnit = new ResearchUnit(
      'rs-123',
      'RS',
      [new Literal('Research Unit', 'en')],
      [new Literal('A description', 'en')],
      'RS_signature',
      [{ type: 'nns', value: '12345' }],
    )

    expect(mockDAO.createOrUpdateResearchUnit).toHaveBeenCalledWith(
      expectedResearchUnit,
    )
  })

  it('should throw an error if an invalid identifier type is provided', async () => {
    const message: AMQPResearchUnitMessage = {
      type: 'research_unit',
      event: 'updated',
      fields: {
        uid: 'rs-123',
        identifiers: [{ type: 'INVALID', value: '12345' }],
        names: [{ value: 'Research Unit', language: 'en' }],
        acronym: 'RS',
        descriptions: [{ value: 'A description', language: 'en' }],
        signature: 'RS_signature',
      },
    }

    worker = new ResearchUnitWorker(message, mockDAO)

    await expect(worker.process()).rejects.toThrow(
      'Unsupported identifier type: INVALID',
    )
  })
})
