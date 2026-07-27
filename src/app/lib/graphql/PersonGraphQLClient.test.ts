import { PersonGraphQLClient } from './PersonGraphQLClient'
import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { Person } from '@/types/Person'
import { PersonMembership } from '@/types/PersonMembership'
import { PersonEmployment } from '@/types/PersonEmployment'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { OrganizationIdentifierType } from '@/types/OrganizationUnitIdentifier'
import { Literal } from '@/types/Literal'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'

jest.mock('./AbstractGraphQLClient')

describe('PersonGraphQLClient', () => {
  let client: PersonGraphQLClient
  let mockQuery: jest.Mock
  let mockIsEnabled: jest.Mock
  let consoleWarnSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    client = new PersonGraphQLClient()
    const abstractClient = client as unknown as AbstractGraphQLClient
    mockQuery = abstractClient.query as jest.Mock
    mockIsEnabled = abstractClient.isEnabled as jest.Mock
    mockIsEnabled.mockReturnValue(true)
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  test('should return null if no person matches the agent identifier', async () => {
    mockQuery.mockResolvedValue({ people: [] })

    const personIdentifier: PersonIdentifier = new PersonIdentifier(
      PersonIdentifierType.orcid,
      '12345',
    )
    const person = await client.getPersonByIdentifier(personIdentifier)

    expect(person).toBeNull()
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), {
      where: {
        AND: [
          {
            identifiers_SOME: {
              type_EQ: 'orcid',
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
            { type: 'scopus', value: '67890' },
            { type: 'eppn', value: 'jdoe@univ.edu' },
          ],
          names: [
            {
              first_names: [{ value: 'John' }],
              last_names: [{ value: 'Doe' }],
            },
          ],
          recorded_by: [],
        },
      ],
    }

    mockQuery.mockResolvedValue(mockResponse)

    const personIdentifier: PersonIdentifier = new PersonIdentifier(
      PersonIdentifierType.orcid,
      '12345',
    )
    const person = await client.getPersonByIdentifier(personIdentifier)

    const expectedPerson = new Person(
      'person-123',
      false,
      null,
      'John Doe',
      'John',
      'Doe',
      [
        new PersonIdentifier(PersonIdentifierType.orcid, '12345'),
        new PersonIdentifier(PersonIdentifierType.scopus, '67890'),
        new PersonIdentifier(PersonIdentifierType.eppn, 'jdoe@univ.edu'),
      ],
    )
    expect(person).toEqual(expectedPerson)
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), {
      where: {
        AND: [
          {
            identifiers_SOME: {
              type_EQ: 'orcid',
              value_EQ: '12345',
            },
          },
        ],
      },
    })
  })

  test('should hydrate memberships as OrganizationUnits from the node labels', async () => {
    const mockResponse = {
      people: [
        {
          uid: 'person-123',
          external: false,
          display_name: 'John Doe',
          identifiers: [{ type: 'orcid', value: '12345' }],
          names: [
            {
              first_names: [{ value: 'John' }],
              last_names: [{ value: 'Doe' }],
            },
          ],
          membershipsConnection: {
            edges: [
              {
                properties: {
                  start_date: '2020-01-01',
                  position_code: 'PR',
                },
                node: {
                  uid: 'unit-1',
                  short_labels: [{ value: 'ACR' }],
                  long_labels: [{ value: 'JD Laboratory', language: 'en' }],
                  identifiers: [{ type: 'nns', value: '001234567Z' }],
                  types: ['OrganizationUnit', 'Unit', 'ResearchUnit'],
                  generic_type: 'unit',
                  national_type: 'UMR',
                  external: false,
                },
              },
            ],
          },
          recorded_by: [],
        },
      ],
    }

    mockQuery.mockResolvedValue(mockResponse)

    const person = await client.getPersonByIdentifier(
      new PersonIdentifier(PersonIdentifierType.orcid, '12345'),
    )

    const expectedPerson = new Person(
      'person-123',
      false,
      null,
      'John Doe',
      'John',
      'Doe',
      [new PersonIdentifier(PersonIdentifierType.orcid, '12345')],
      [
        new PersonMembership(
          new OrganizationUnit(
            'unit-1',
            'ACR',
            [new Literal('JD Laboratory', 'en')],
            [],
            OrganizationCategory.research_unit,
            OrganizationGenericType.unit,
            'UMR',
            [{ type: OrganizationIdentifierType.nns, value: '001234567Z' }],
            null,
            false,
          ),
          '2020-01-01',
          null,
          'PR',
        ),
      ],
    )
    expect(person).toEqual(expectedPerson)
  })

  test('should hydrate employments as PersonEmployments toward institutions', async () => {
    const mockResponse = {
      people: [
        {
          uid: 'person-123',
          external: false,
          display_name: 'John Doe',
          identifiers: [],
          names: [
            {
              first_names: [{ value: 'John' }],
              last_names: [{ value: 'Doe' }],
            },
          ],
          employmentsConnection: {
            edges: [
              {
                properties: {
                  start_date: '2018-09-01',
                  end_date: null,
                  position_code: 'MCF',
                },
                node: {
                  uid: 'local-UP1',
                  short_labels: [{ value: 'UP1', language: 'fr' }],
                  long_labels: [
                    { value: 'Université Paris 1', language: 'fr' },
                  ],
                  identifiers: [{ type: 'local', value: 'UP1' }],
                  types: ['OrganizationUnit', 'Institution'],
                  generic_type: 'institution',
                  national_type: 'UNIV',
                  external: false,
                },
              },
            ],
          },
        },
      ],
    }

    mockQuery.mockResolvedValue(mockResponse)

    const person = await client.getPersonByUid('person-123')

    expect(person!.employments).toHaveLength(1)
    const employment = person!.employments[0]
    expect(employment).toBeInstanceOf(PersonEmployment)
    expect(employment.organizationUnit.uid).toBe('local-UP1')
    expect(employment.organizationUnit.category).toBe(
      OrganizationCategory.institution,
    )
    expect(employment.organizationUnit.type).toBe('institution')
    expect(employment.startDate).toBe('2018-09-01')
    expect(employment.positionCode).toBe('MCF')
    // memberships untouched
    expect(person!.memberships).toEqual([])
  })

  test('should skip membership edges whose node has no recognizable type labels', async () => {
    const mockResponse = {
      people: [
        {
          uid: 'person-123',
          external: false,
          display_name: 'John Doe',
          identifiers: [{ type: 'orcid', value: '12345' }],
          names: [
            {
              first_names: [{ value: 'John' }],
              last_names: [{ value: 'Doe' }],
            },
          ],
          membershipsConnection: {
            edges: [
              {
                properties: {},
                node: {
                  uid: 'unit-untyped',
                  short_labels: [{ value: 'UNT' }],
                  long_labels: [{ value: 'Untyped Unit', language: 'en' }],
                  identifiers: [],
                  // bare unit without mission label: category cannot be derived
                  types: ['OrganizationUnit', 'Unit'],
                  generic_type: 'unit',
                },
              },
              {
                properties: {},
                node: {
                  uid: 'institution-1',
                  short_labels: [{ value: 'UNIV' }],
                  long_labels: [{ value: 'Some University', language: 'en' }],
                  identifiers: [],
                  types: ['OrganizationUnit', 'Institution'],
                  generic_type: 'institution',
                },
              },
            ],
          },
          recorded_by: [],
        },
      ],
    }

    mockQuery.mockResolvedValue(mockResponse)

    const person = await client.getPersonByIdentifier(
      new PersonIdentifier(PersonIdentifierType.orcid, '12345'),
    )

    expect(person?.memberships).toHaveLength(1)
    expect(person?.memberships[0].organizationUnit.uid).toBe('institution-1')
    expect(person?.memberships[0].organizationUnit.category).toBe(
      OrganizationCategory.institution,
    )
    // The skipped edge's unit uid is reported so it still counts toward the
    // keep-set when affiliations are replaced
    expect(person?.unhydratedMembershipOrgUids).toEqual(['unit-untyped'])
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Cannot determine category of organization unit-untyped',
      ),
    )
  })

  test('should hydrate source-person records from recorded_by', async () => {
    const mockResponse = {
      people: [
        {
          uid: 'person-123',
          external: false,
          display_name: 'John Doe',
          identifiers: [{ type: 'orcid', value: '12345' }],
          names: [
            {
              first_names: [{ value: 'John' }],
              last_names: [{ value: 'Doe' }],
            },
          ],
          recorded_by: [
            {
              uid: 'hal-jdoe',
              name: 'John Doe',
              source: 'hal',
              source_identifier: 'jdoe',
              identifiers: [{ type: 'idhals', value: 'john-doe' }],
            },
          ],
        },
      ],
    }

    mockQuery.mockResolvedValue(mockResponse)

    const person = await client.getPersonByIdentifier(
      new PersonIdentifier(PersonIdentifierType.orcid, '12345'),
    )

    expect(person?.records).toHaveLength(1)
    expect(person?.records[0].uid).toBe('hal-jdoe')
    expect(person?.records[0].source).toBe('hal')
    expect(person?.records[0].getIdentifiers()).toHaveLength(1)
  })

  test('should log a warning for unsupported identifier types and skip them', async () => {
    const mockResponse = {
      people: [
        {
          uid: 'person-456',
          external: true,
          display_name: 'Jane Smith',
          identifiers: [
            { type: 'orcid', value: '98765' },
            { type: 'unknown_type', value: 'abcde' }, // Unsupported identifier type
          ],
          names: [
            {
              first_names: [{ value: 'Jane' }],
              last_names: [{ value: 'Smith' }],
            },
          ],
          recorded_by: [],
        },
      ],
    }

    mockQuery.mockResolvedValue(mockResponse)

    const personIdentifier: PersonIdentifier = new PersonIdentifier(
      PersonIdentifierType.orcid,
      '98765',
    )
    const person = await client.getPersonByIdentifier(personIdentifier)

    const expectedPerson = new Person(
      'person-456',
      true,
      null,
      'Jane Smith',
      'Jane',
      'Smith',
      [new PersonIdentifier(PersonIdentifierType.orcid, '98765')],
    )
    expect(person).toEqual(expectedPerson)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Unsupported identifier type for abcde: unknown_type',
    )
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), {
      where: {
        AND: [
          {
            identifiers_SOME: {
              type_EQ: 'orcid',
              value_EQ: '98765',
            },
          },
        ],
      },
    })
  })
})
