import { IdentifierValidationSyncService } from '@/lib/services/IdentifierValidationSyncService'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { Person } from '@/types/Person'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

jest.mock('@/lib/daos/PersonDAO')
jest.mock('@/lib/graphql/PersonGraphQLClient')

const graphPerson = (uid: string, identifiers: PersonIdentifier[]) =>
  new Person(uid, false, null, uid, 'First', 'Last', identifiers)

describe('IdentifierValidationSyncService', () => {
  let personDAO: jest.Mocked<PersonDAO>
  let graphClient: jest.Mocked<PersonGraphQLClient>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    personDAO = new PersonDAO() as jest.Mocked<PersonDAO>
    graphClient = new PersonGraphQLClient() as jest.Mocked<PersonGraphQLClient>
  })

  it('syncs the validatable identifiers of each person from the graph', async () => {
    personDAO.fetchInternalPersonUidsWithIdentifierTypes.mockResolvedValue([
      'p1',
      'p2',
    ])
    const idref = new PersonIdentifier(PersonIdentifierType.idref, '1', true)
    const local = new PersonIdentifier(PersonIdentifierType.local, 'x', true)
    graphClient.getPersonByUid.mockImplementation(async (uid) =>
      uid === 'p1' ? graphPerson('p1', [idref, local]) : null,
    )
    personDAO.syncIdentifiersValidation.mockResolvedValue(1)

    const result = await new IdentifierValidationSyncService(
      personDAO,
      graphClient,
    ).syncFromGraph()

    expect(personDAO.syncIdentifiersValidation).toHaveBeenCalledTimes(1)
    expect(personDAO.syncIdentifiersValidation).toHaveBeenCalledWith('p1', [
      idref,
    ])
    expect(result).toEqual({ people: 2, updated: 1, failed: 0 })
  })

  it('counts a failing person and carries on with the next ones', async () => {
    personDAO.fetchInternalPersonUidsWithIdentifierTypes.mockResolvedValue([
      'p1',
      'p2',
    ])
    graphClient.getPersonByUid.mockImplementation(async (uid) => {
      if (uid === 'p1') throw new Error('graph down')
      return graphPerson('p2', [
        new PersonIdentifier(PersonIdentifierType.orcid, '0000', false),
      ])
    })
    personDAO.syncIdentifiersValidation.mockResolvedValue(1)

    const result = await new IdentifierValidationSyncService(
      personDAO,
      graphClient,
    ).syncFromGraph()

    expect(result).toEqual({ people: 2, updated: 1, failed: 1 })
  })
})
