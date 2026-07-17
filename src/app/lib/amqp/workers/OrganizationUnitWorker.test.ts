import { OrganizationUnitWorker } from '@/lib/amqp/workers/OrganizationUnitWorker'
import { AMQPOrganizationUnitMessage } from '@/types/AMQPOrganizationUnitMessage'
import { OrganizationUnitDAO } from '@/lib/daos/OrganizationUnitDAO'
import { OrganizationUnitGraphQLClient } from '@/lib/graphql/OrganizationUnitGraphQLClient'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'
import { Literal } from '@/types/Literal'

jest.mock('@/lib/daos/OrganizationUnitDAO', () => ({
  OrganizationUnitDAO: jest.fn().mockImplementation(() => ({
    createOrUpdateOrganizationUnit: jest.fn(),
  })),
}))

jest.mock('@/lib/graphql/OrganizationUnitGraphQLClient', () => ({
  OrganizationUnitGraphQLClient: jest.fn().mockImplementation(() => ({
    getOrganizationUnitByUid: jest.fn(),
  })),
}))

const makeMessage = (
  event: AMQPOrganizationUnitMessage['event'] = 'created',
): AMQPOrganizationUnitMessage => ({
  type: 'unit',
  event,
  fields: {
    uid: 'local-RS001',
    identifiers: [{ type: 'local', value: 'RS001' }],
  },
})

const makeOrganizationUnit = (): OrganizationUnit =>
  new OrganizationUnit(
    'local-RS001',
    'RS',
    [Literal.fromObject({ value: 'Research team', language: 'en' })],
    [],
    OrganizationCategory.research_unit,
    OrganizationGenericType.unit,
  )

describe('OrganizationUnitWorker', () => {
  let organizationUnitDAO: jest.Mocked<OrganizationUnitDAO>
  let organizationUnitGraphQLClient: jest.Mocked<OrganizationUnitGraphQLClient>

  beforeEach(() => {
    jest.clearAllMocks()
    organizationUnitDAO =
      new OrganizationUnitDAO() as jest.Mocked<OrganizationUnitDAO>
    organizationUnitGraphQLClient =
      new OrganizationUnitGraphQLClient() as jest.Mocked<OrganizationUnitGraphQLClient>
  })

  const makeWorker = (message: AMQPOrganizationUnitMessage) =>
    new OrganizationUnitWorker(
      message,
      organizationUnitDAO,
      organizationUnitGraphQLClient,
    )

  it.each(['created', 'updated', 'unchanged'] as const)(
    'fetches the structure from the graph and upserts it on %s events',
    async (event) => {
      const organizationUnit = makeOrganizationUnit()
      organizationUnitGraphQLClient.getOrganizationUnitByUid.mockResolvedValue(
        organizationUnit,
      )

      const events = await makeWorker(makeMessage(event)).process()

      expect(
        organizationUnitGraphQLClient.getOrganizationUnitByUid,
      ).toHaveBeenCalledWith('local-RS001')
      expect(
        organizationUnitDAO.createOrUpdateOrganizationUnit,
      ).toHaveBeenCalledWith(organizationUnit)
      expect(events).toEqual([])
    },
  )

  it('ignores deleted events without touching the graph or the database', async () => {
    const events = await makeWorker(makeMessage('deleted')).process()

    expect(
      organizationUnitGraphQLClient.getOrganizationUnitByUid,
    ).not.toHaveBeenCalled()
    expect(
      organizationUnitDAO.createOrUpdateOrganizationUnit,
    ).not.toHaveBeenCalled()
    expect(events).toEqual([])
  })

  it('logs an error and skips when the structure is not found in the graph', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    organizationUnitGraphQLClient.getOrganizationUnitByUid.mockResolvedValue(
      null,
    )

    const events = await makeWorker(makeMessage()).process()

    expect(
      organizationUnitDAO.createOrUpdateOrganizationUnit,
    ).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('local-RS001 not found in the graph'),
    )
    expect(events).toEqual([])
    consoleErrorSpy.mockRestore()
  })

  it('propagates GraphQL client errors', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    organizationUnitGraphQLClient.getOrganizationUnitByUid.mockRejectedValue(
      new Error('GraphQL error'),
    )

    await expect(makeWorker(makeMessage()).process()).rejects.toThrow(
      'GraphQL error',
    )
  })

  it('propagates DAO errors', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    organizationUnitGraphQLClient.getOrganizationUnitByUid.mockResolvedValue(
      makeOrganizationUnit(),
    )
    organizationUnitDAO.createOrUpdateOrganizationUnit.mockRejectedValue(
      new Error('Database error'),
    )

    await expect(makeWorker(makeMessage()).process()).rejects.toThrow(
      'Database error',
    )
  })
})
