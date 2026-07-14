import { createStore, StoreApi } from 'zustand'
import {
  addOrganizationUnitSlice,
  OrganizationUnitSlice,
} from './organizationUnitSlice'
import { i18n } from '@lingui/core'
import {
  OrganizationCategory,
  OrganizationGenericType,
  OrganizationIdentifierType,
} from '@prisma/client'
import { Literal } from '@/types/Literal'
import { OrganizationUnit } from '@/types/OrganizationUnit'

const mockFetchResponse = (
  data: {
    hasMore: boolean
    organizations: OrganizationUnit[]
    total: number
  },
  ok = true,
) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(data),
    } as Response),
  )
}

const mockFetchError = (error: Error) => {
  global.fetch = jest.fn(() => Promise.reject(error))
}

const makeOrganizationUnit = (uid: string, acronym: string) =>
  new OrganizationUnit(
    uid,
    acronym,
    [new Literal('Valid Research Unit', 'en')],
    [new Literal('Valid Description', 'en')],
    OrganizationCategory.research_unit,
    OrganizationGenericType.unit,
    null,
    [
      { type: OrganizationIdentifierType.nns, value: '12345' },
      { type: OrganizationIdentifierType.ror, value: '67890' },
    ],
  )

describe('addOrganizationUnitSlice', () => {
  let store: StoreApi<OrganizationUnitSlice>

  beforeEach(() => {
    store = createStore(addOrganizationUnitSlice)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should fetch and store organizations successfully', async () => {
    const organizationsData = [
      makeOrganizationUnit('RS123', 'ABC'),
      makeOrganizationUnit('RS124', 'ADF'),
    ]
    const response = {
      hasMore: true,
      organizations: organizationsData,
      total: 2,
    }
    mockFetchResponse(response)

    await store.getState().organization.fetchOrganizationsByName({
      searchTerm: 'test',
      page: 1,
      group: 'research_unit',
    })

    const state = store.getState().organization
    const groupState = state.byGroup.research_unit
    expect(groupState.loading).toBe(false)
    expect(groupState.organizations).toEqual(organizationsData)
    expect(groupState.hasMore).toBe(true)
    expect(groupState.total).toBe(2)
    expect(state.error).toBe(null)
    expect(fetch).toHaveBeenCalledWith(
      '/api/organizations?searchTerm=test&page=1&group=research_unit',
      expect.objectContaining({
        headers: { 'accept-language': i18n.locale },
      }),
    )
  })

  it('should not touch other groups when fetching one group', async () => {
    const organizationsData = [makeOrganizationUnit('RS123', 'ABC')]
    mockFetchResponse({
      hasMore: false,
      organizations: organizationsData,
      total: 1,
    })

    await store.getState().organization.fetchOrganizationsByName({
      searchTerm: 'test',
      page: 1,
      group: 'research_unit',
    })

    const state = store.getState().organization
    expect(state.byGroup.research_unit.organizations).toEqual(organizationsData)
    expect(state.byGroup.institution.organizations).toEqual([])
    expect(state.byGroup.other_structure.organizations).toEqual([])
    expect(state.byGroup.team.organizations).toEqual([])
  })

  it('should handle fetch error correctly', async () => {
    const errorMessage = 'Network error'
    mockFetchError(new Error(errorMessage))

    await store.getState().organization.fetchOrganizationsByName({
      searchTerm: 'test',
      page: 1,
      group: 'research_unit',
    })

    const state = store.getState().organization
    expect(state.byGroup.research_unit.loading).toBe(false)
    expect(state.byGroup.research_unit.organizations).toEqual([])
    expect(state.error).toEqual('Network error')
  })

  it('should append organization data on subsequent pages', async () => {
    const initialOrganizations = [makeOrganizationUnit('RS123', 'ABC')]
    const newOrganizations = [makeOrganizationUnit('RS124', 'ADF')]
    const responsePage1 = {
      hasMore: true,
      organizations: initialOrganizations,
      total: 2,
    }
    const responsePage2 = {
      hasMore: false,
      organizations: newOrganizations,
      total: 2,
    }

    mockFetchResponse(responsePage1)
    await store.getState().organization.fetchOrganizationsByName({
      searchTerm: '',
      page: 1,
      group: 'research_unit',
    })

    mockFetchResponse(responsePage2)
    await store.getState().organization.fetchOrganizationsByName({
      searchTerm: '',
      page: 2,
      group: 'research_unit',
    })

    const groupState = store.getState().organization.byGroup.research_unit
    expect(groupState.organizations).toEqual([
      ...initialOrganizations,
      ...newOrganizations,
    ])
    expect(groupState.hasMore).toBe(false)
    expect(groupState.total).toBe(2)
  })

  it('should reinitialize the group list on page 1', async () => {
    mockFetchResponse({
      hasMore: false,
      organizations: [makeOrganizationUnit('RS123', 'ABC')],
      total: 1,
    })
    await store.getState().organization.fetchOrganizationsByName({
      searchTerm: 'abc',
      page: 1,
      group: 'institution',
    })

    const refreshedOrganizations = [makeOrganizationUnit('RS999', 'XYZ')]
    mockFetchResponse({
      hasMore: false,
      organizations: refreshedOrganizations,
      total: 1,
    })
    await store.getState().organization.fetchOrganizationsByName({
      searchTerm: 'xyz',
      page: 1,
      group: 'institution',
    })

    const groupState = store.getState().organization.byGroup.institution
    expect(groupState.organizations).toEqual(refreshedOrganizations)
  })
})
