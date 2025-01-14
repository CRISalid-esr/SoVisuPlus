import { ResearchStructureWorker } from '@/lib/amqp/workers/ResearchStructureWorker'
import { AMQPResearchStructureMessage } from '@/types/AMQPResearchStructureMessage'
import { ResearchStructureDAO } from '@/lib/daos/ResearchStructureDAO'

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
        identifiers: [{ type: 'RNSR', value: '12345' }],
        names: [{ value: 'Research Structure', language: 'en' }],
        acronym: 'RS',
        descriptions: [{ value: 'A description', language: 'en' }],
      },
    }

    worker = new ResearchStructureWorker(message, mockDAO)

    await worker.process()

    expect(mockDAO.createOrUpdateResearchStructure).toHaveBeenCalledWith({
      uid: 'rs-123',
      _identifiers: [{ type: 'RNSR', value: '12345' }],
      names: { en: 'Research Structure' },
      acronym: 'RS',
      descriptions: { en: 'A description' },
    })
  })

  it('should log and throw an error if processing fails', async () => {
    const message: AMQPResearchStructureMessage = {
      type: 'research_structure',
      event: 'updated',
      fields: {
        uid: 'rs-123',
        identifiers: [{ type: 'RNSR', value: '12345' }],
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

    expect(mockDAO.createOrUpdateResearchStructure).toHaveBeenCalledWith({
      uid: 'rs-123',
      _identifiers: [{ type: 'RNSR', value: '12345' }],
      names: { en: 'Research Structure' },
      acronym: 'RS',
      descriptions: { en: 'A description' },
    })
  })
})
