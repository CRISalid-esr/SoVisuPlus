import { PersonGraphQLClient } from './PersonGraphQLClient'
import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

jest.mock('./AbstractGraphQLClient')

describe('PersonGraphQLClient', () => {
  let client: PersonGraphQLClient
  let mockQuery: jest.Mock
  let mockIsEnabled: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    client = new PersonGraphQLClient()
    const abstractClient = client as unknown as AbstractGraphQLClient
    mockQuery = abstractClient.query as jest.Mock
    mockIsEnabled = abstractClient.isEnabled as jest.Mock
    mockIsEnabled.mockReturnValue(true)
  })

  test('should return null if no person matches the agent identifier', async () => {
    mockQuery.mockResolvedValue({ people: [] })

    const personIdentifier: PersonIdentifier = { type: 'ORCID', value: '12345' }
    const person = await client.getPersonByIdentifier(personIdentifier)

    expect(person).toBeNull()
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), {
      where: {
        AND: [
          {
            identifiers_SOME: {
              type_EQ: 'ORCID',
              value_EQ: '12345',
            },
          },
        ],
      },
    })
  })

  test('should return a hydrated person object if a match is found', async () => {
    const mockResponse = {
      people: [
        {
          uid: 'person-123',
          external: false,
          display_name: 'John Doe',
          identifiers: [
            { type: 'orcid', value: '12345' },
            { type: 'scopus_eid', value: '67890' },
          ],
          names: [
            {
              first_names: [{ value: 'John' }],
              last_names: [{ value: 'Doe' }],
            },
          ],
        },
      ],
    }

    mockQuery.mockResolvedValue(mockResponse)

    const personIdentifier: PersonIdentifier = { type: 'ORCID', value: '12345' }
    const person = await client.getPersonByIdentifier(personIdentifier)

    expect(person).toEqual({
      uid: 'person-123',
      external: false,
      displayName: 'John Doe',
      identifiers: [
        { type: PersonIdentifierType.ORCID, value: '12345' },
        { type: PersonIdentifierType.SCOPUS_EID, value: '67890' },
      ],
      firstName: 'John',
      lastName: 'Doe',
      email: null,
    })
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), {
      where: {
        AND: [
          {
            identifiers_SOME: {
              type_EQ: 'ORCID',
              value_EQ: '12345',
            },
          },
        ],
      },
    })
  })
})
