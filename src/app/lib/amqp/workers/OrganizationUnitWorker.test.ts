import { OrganizationUnitWorker } from '@/lib/amqp/workers/OrganizationUnitWorker'
import { AMQPOrganizationUnitMessage } from '@/types/AMQPOrganizationUnitMessage'
import { OrganizationUnitDAO } from '@/lib/daos/OrganizationUnitDAO'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { Literal } from '@/types/Literal'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'

jest.mock('@/lib/daos/OrganizationUnitDAO', () => {
  return {
    OrganizationUnitDAO: jest.fn().mockImplementation(() => {
      return {
        createOrUpdateOrganizationUnit: jest.fn(),
      }
    }),
  }
})

const mockDAO = new OrganizationUnitDAO()

describe('OrganizationUnitWorker', () => {
  let worker: OrganizationUnitWorker

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should process a valid organization unit message', async () => {
    const message: AMQPOrganizationUnitMessage = {
      type: 'unit',
      event: 'updated',
      fields: {
        uid: 'rs-123',
        national_type: 'UMR',
        identifiers: [
          { type: 'nns', value: '12345' },
          { type: 'ror', value: 'https://ror.org/01' },
        ],
        long_labels: [{ value: 'Research Unit', language: 'en' }],
        short_labels: [{ value: 'RS', language: 'en' }],
        descriptions: [{ value: 'A description', language: 'en' }],
        local_types: [{ value: 'Unité mixte', language: 'fr' }],
        main_mission: 'research',
      },
    }

    worker = new OrganizationUnitWorker(message, mockDAO)

    await worker.process()

    const expectedOrganizationUnit = new OrganizationUnit(
      'rs-123',
      'RS',
      [new Literal('Research Unit', 'en')],
      [new Literal('A description', 'en')],
      OrganizationCategory.research_unit,
      OrganizationGenericType.unit,
      'UMR',
      [
        { type: 'nns', value: '12345' },
        { type: 'ror', value: 'https://ror.org/01' },
      ],
      null,
      false,
      [new Literal('Unité mixte', 'fr')],
    )

    expect(mockDAO.createOrUpdateOrganizationUnit).toHaveBeenCalledWith(
      expectedOrganizationUnit,
    )
  })

  it.each([
    ['research', OrganizationCategory.research_unit],
    ['scientific_services', OrganizationCategory.support_unit],
    ['administrative_services', OrganizationCategory.administrative_unit],
    ['teaching', OrganizationCategory.teaching_unit],
    ['unknown_mission', OrganizationCategory.research_unit],
    [undefined, OrganizationCategory.research_unit],
  ])(
    'should derive the category of a unit from main_mission %s',
    async (mainMission, expectedCategory) => {
      const message: AMQPOrganizationUnitMessage = {
        type: 'unit',
        event: 'updated',
        fields: {
          uid: 'rs-123',
          identifiers: [],
          long_labels: [{ value: 'Some Unit', language: 'en' }],
          main_mission: mainMission,
        },
      }

      worker = new OrganizationUnitWorker(message, mockDAO)

      await worker.process()

      expect(mockDAO.createOrUpdateOrganizationUnit).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'rs-123',
          category: expectedCategory,
          genericType: OrganizationGenericType.unit,
        }),
      )
    },
  )

  it.each([
    ['institution', OrganizationCategory.institution],
    ['institution_subdivision', OrganizationCategory.institution_subdivision],
    ['unit_subdivision', OrganizationCategory.unit_subdivision],
    ['team', OrganizationCategory.team],
  ] as const)(
    'should use the message type as category for %s messages',
    async (type, expectedCategory) => {
      const message: AMQPOrganizationUnitMessage = {
        type,
        event: 'updated',
        fields: {
          uid: 'org-123',
          identifiers: [],
          long_labels: [{ value: 'Some Structure', language: 'en' }],
        },
      }

      worker = new OrganizationUnitWorker(message, mockDAO)

      await worker.process()

      expect(mockDAO.createOrUpdateOrganizationUnit).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'org-123',
          category: expectedCategory,
          genericType: type,
        }),
      )
    },
  )

  it('should log and throw an error if processing fails', async () => {
    const message: AMQPOrganizationUnitMessage = {
      type: 'unit',
      event: 'updated',
      fields: {
        uid: 'rs-123',
        national_type: null,
        identifiers: [{ type: 'nns', value: '12345' }],
        long_labels: [{ value: 'Research Unit', language: 'en' }],
        short_labels: [{ value: 'RS', language: 'en' }],
        descriptions: [{ value: 'A description', language: 'en' }],
        main_mission: 'research',
      },
    }

    worker = new OrganizationUnitWorker(message, mockDAO)
    ;(mockDAO.createOrUpdateOrganizationUnit as jest.Mock).mockRejectedValue(
      new Error('Database error'),
    )

    await expect(worker.process()).rejects.toThrow('Database error')

    const expectedOrganizationUnit = new OrganizationUnit(
      'rs-123',
      'RS',
      [new Literal('Research Unit', 'en')],
      [new Literal('A description', 'en')],
      OrganizationCategory.research_unit,
      OrganizationGenericType.unit,
      null,
      [{ type: 'nns', value: '12345' }],
      null,
      false,
      [],
    )

    expect(mockDAO.createOrUpdateOrganizationUnit).toHaveBeenCalledWith(
      expectedOrganizationUnit,
    )
  })

  it('should throw an error if an invalid identifier type is provided', async () => {
    const message: AMQPOrganizationUnitMessage = {
      type: 'unit',
      event: 'updated',
      fields: {
        uid: 'rs-123',
        national_type: null,
        identifiers: [{ type: 'INVALID', value: '12345' }],
        long_labels: [{ value: 'Research Unit', language: 'en' }],
        short_labels: [{ value: 'RS', language: 'en' }],
        descriptions: [{ value: 'A description', language: 'en' }],
        main_mission: 'research',
      },
    }

    worker = new OrganizationUnitWorker(message, mockDAO)

    await expect(worker.process()).rejects.toThrow(
      'Unsupported identifier type: INVALID',
    )
  })
})
