import {
  GraphOrganizationUnitResponse,
  OrganizationUnitGraphQLClient,
} from '@/lib/graphql/OrganizationUnitGraphQLClient'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'

const makeResponse = (
  overrides: Partial<GraphOrganizationUnitResponse> = {},
): GraphOrganizationUnitResponse => ({
  uid: 'local-RS001',
  external: false,
  generic_type: 'unit',
  national_type: 'UMR',
  types: ['OrganizationUnit', 'Unit', 'ResearchUnit'],
  long_labels: [
    { value: 'Example Research Center', language: 'en' },
    { value: 'Centre de recherche exemple', language: 'fr' },
  ],
  short_labels: [{ value: 'ERC', language: 'en' }],
  local_types: [{ value: 'Centre', language: 'fr' }],
  descriptions: [{ value: 'Example description', language: 'en' }],
  identifiers: [
    { type: 'local', value: 'RS001' },
    { type: 'ror', value: 'ROR-EXAMPLE' },
  ],
  ...overrides,
})

describe('OrganizationUnitGraphQLClient hydration', () => {
  let client: OrganizationUnitGraphQLClient

  beforeEach(() => {
    jest.restoreAllMocks()
    client = new OrganizationUnitGraphQLClient()
  })

  it('hydrates a research unit from graph labels', () => {
    const organizationUnit = client.hydrate(makeResponse())

    expect(organizationUnit).not.toBeNull()
    expect(organizationUnit!.uid).toBe('local-RS001')
    expect(organizationUnit!.category).toBe(OrganizationCategory.research_unit)
    expect(organizationUnit!.genericType).toBe(OrganizationGenericType.unit)
    expect(organizationUnit!.nationalType).toBe('UMR')
    expect(organizationUnit!.acronym).toBe('ERC')
    expect(organizationUnit!.names.map((n) => n.value)).toEqual([
      'Example Research Center',
      'Centre de recherche exemple',
    ])
    expect(organizationUnit!.localTypes.map((lt) => lt.value)).toEqual([
      'Centre',
    ])
    expect(organizationUnit!.identifiers).toEqual([
      { type: 'local', value: 'RS001' },
      { type: 'ror', value: 'ROR-EXAMPLE' },
    ])
    expect(organizationUnit!.external).toBe(false)
  })

  it.each([
    [['OrganizationUnit', 'Unit', 'SupportUnit'], 'support_unit'],
    [['OrganizationUnit', 'Unit', 'AdministrativeUnit'], 'administrative_unit'],
    [['OrganizationUnit', 'Unit', 'TeachingUnit'], 'teaching_unit'],
    [['OrganizationUnit', 'Institution'], 'institution'],
    [['OrganizationUnit', 'InstitutionSubdivision'], 'institution_subdivision'],
    [['OrganizationUnit', 'DoctoralSchool'], 'doctoral_school'],
    [['OrganizationUnit', 'UnitSubdivision'], 'unit_subdivision'],
    [['OrganizationUnit', 'Team'], 'team'],
  ])('derives the category from labels %j → %s', (types, category) => {
    const organizationUnit = client.hydrate(
      makeResponse({ types: types as string[], generic_type: 'ignored' }),
    )
    expect(organizationUnit!.category).toBe(category)
  })

  it('falls back to generic_type for label-less external nodes', () => {
    const organizationUnit = client.hydrate(
      makeResponse({
        uid: 'uai-0000000A',
        external: true,
        generic_type: 'institution',
        national_type: null,
        types: ['OrganizationUnit'],
        long_labels: [],
        short_labels: [],
        identifiers: [{ type: 'uai', value: '0000000A' }],
      }),
    )

    expect(organizationUnit).not.toBeNull()
    expect(organizationUnit!.category).toBe(OrganizationCategory.institution)
    expect(organizationUnit!.external).toBe(true)
    expect(organizationUnit!.acronym).toBeNull()
  })

  it('returns null and logs an error for a unit without mission label', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const organizationUnit = client.hydrate(
      makeResponse({ types: ['OrganizationUnit', 'Unit'] }),
    )

    expect(organizationUnit).toBeNull()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cannot determine category'),
    )
  })

  it('hydrates part_of and member_of edges into parents', () => {
    const organizationUnit = client.hydrate(
      makeResponse({
        part_ofConnection: {
          edges: [
            {
              node: makeResponse({
                uid: 'local-DGB',
                types: ['OrganizationUnit', 'Unit', 'AdministrativeUnit'],
              }),
              properties: { start_date: '2010-01-01', end_date: '2030-12-31' },
            },
          ],
        },
        member_ofConnection: {
          edges: [
            {
              node: makeResponse({
                uid: 'local-UP1',
                types: ['OrganizationUnit', 'Institution'],
              }),
              properties: {
                position: 'main_supervision',
                start_date: '2000-01-01',
                end_date: null,
              },
            },
          ],
        },
      }),
    )

    expect(organizationUnit!.parents).toHaveLength(2)
    const [partOf, memberOf] = organizationUnit!.parents
    expect(partOf.kind).toBe('part_of')
    expect(partOf.parent.uid).toBe('local-DGB')
    expect(partOf.position).toBeNull()
    expect(partOf.startDate).toBe('2010-01-01')
    expect(partOf.endDate).toBe('2030-12-31')
    expect(memberOf.kind).toBe('member_of')
    expect(memberOf.parent.uid).toBe('local-UP1')
    expect(memberOf.parent.category).toBe(OrganizationCategory.institution)
    expect(memberOf.position).toBe('main_supervision')
    expect(memberOf.endDate).toBeNull()
  })

  it('skips relationship edges whose parent cannot be typed', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const organizationUnit = client.hydrate(
      makeResponse({
        member_ofConnection: {
          edges: [
            {
              node: makeResponse({
                uid: 'local-UNTYPED',
                types: ['OrganizationUnit', 'Unit'],
              }),
              properties: {},
            },
            {
              node: makeResponse({
                uid: 'local-UP1',
                types: ['OrganizationUnit', 'Institution'],
              }),
              properties: {},
            },
          ],
        },
      }),
    )

    expect(organizationUnit!.parents.map((p) => p.parent.uid)).toEqual([
      'local-UP1',
    ])
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('local-UNTYPED'),
    )
  })

  it('skips unsupported identifier types with a warning', () => {
    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {})

    const organizationUnit = client.hydrate(
      makeResponse({
        identifiers: [
          { type: 'local', value: 'RS001' },
          { type: 'unknown_type', value: 'X' },
        ],
      }),
    )

    expect(organizationUnit!.identifiers).toEqual([
      { type: 'local', value: 'RS001' },
    ])
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('unknown_type'),
    )
  })
})
