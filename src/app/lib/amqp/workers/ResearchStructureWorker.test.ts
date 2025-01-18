import { ResearchStructureWorker } from '@/lib/amqp/workers/ResearchStructureWorker'
import { AMQPResearchStructureMessage } from '@/types/AMQPResearchStructureMessage'
import { ResearchStructureDAO } from '@/lib/daos/ResearchStructureDAO'
import { ResearchStructure } from '@/types/ResearchStructure'

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
    // - Expected
    // + Received
    //
    // @@ -1,6 +1,6 @@
    // - Object {
    // + ResearchStructure {
    //     "_identifiers": Array [
    //       Object {
    //         "type": "RNSR",
    //         "value": "12345",
    //       },
    // @@ -10,7 +10,8 @@
    //       "en": "A description",
    //     },
    //     "names": Object {
    //       "en": "Research Structure",
    //     },
    // +   "type": "research_structure",
    //     "uid": "rs-123",
    //   },
    // }

    //class ResearchStructure implements IAgent {
    //   constructor(
    //     public uid: string,
    //     public acronym: string | null,
    //     public names: Record<string, string>,
    //     public descriptions: Record<string, string>,
    //     private _identifiers: {
    //       type: ResearchStructureIdentifierType
    //       value: string
    //     }[] = [],
    //     public type: 'research_structure' = 'research_structure',
    //   ) {
    //     this.identifiers = _identifiers
    //   }

    const expectedResearchStructure = new ResearchStructure(
      'rs-123',
      'RS',
      { en: 'Research Structure' },
      { en: 'A description' },
      [{ type: 'RNSR', value: '12345' }],
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

    const expectedResearchStructure = new ResearchStructure(
      'rs-123',
      'RS',
      { en: 'Research Structure' },
      { en: 'A description' },
      [{ type: 'RNSR', value: '12345' }],
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
