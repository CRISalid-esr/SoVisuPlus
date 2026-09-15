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

  /**
   * fetch mock whose calls resolve only when the test says so, and reject with
   * an AbortError when their signal is aborted — like the real fetch.
   */
  const controllableFetch = () => {
    const pending: ((data: unknown) => void)[] = []
    global.fetch = jest.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          )
          pending.push((data) =>
            resolve({
              ok: true,
              json: () => Promise.resolve(data),
            } as Response),
          )
        }),
    )
    return pending
  }

  it('ignores the response of a group search replaced by a newer one', async () => {
    const pending = controllableFetch()
    const { fetchOrganizationsByName } = store.getState().organization
    const older = fetchOrganizationsByName({
      searchTerm: 'sorbo',
      page: 1,
      group: 'institution',
    })
    const otherGroup = fetchOrganizationsByName({
      searchTerm: 'sorbo',
      page: 1,
      group: 'team',
    })
    const newer = fetchOrganizationsByName({
      searchTerm: 'sorbonne',
      page: 1,
      group: 'institution',
    })

    pending[2]({
      hasMore: false,
      organizations: [makeOrganizationUnit('UP1', 'UP1')],
      total: 1,
    })
    await newer
    pending[0]({ hasMore: false, organizations: [], total: 0 })
    await older
    // groups are independent: the team search was not aborted
    pending[1]({
      hasMore: false,
      organizations: [makeOrganizationUnit('T1', 'T1')],
      total: 1,
    })
    await otherGroup

    const { byGroup, error } = store.getState().organization
    expect(byGroup.institution.organizations.map((org) => org.uid)).toEqual([
      'UP1',
    ])
    expect(byGroup.institution.loading).toBe(false)
    expect(byGroup.team.organizations.map((org) => org.uid)).toEqual(['T1'])
    expect(error).toBeNull()
  })

  it('ignores the members response of a replaced query', async () => {
    const pending = controllableFetch()
    const { fetchStructureMembers } = store.getState().organization
    const query = {
      uid: 'ru1',
      page: 1,
      pageSize: 10,
      present: true,
      sortBy: 'name',
      sortDesc: false,
    }
    const older = fetchStructureMembers({ ...query, search: 'dur' })
    const newer = fetchStructureMembers({ ...query, search: 'durand' })

    pending[1]({ members: [{ uid: 'p-durand' }], total: 1 })
    await newer
    pending[0]({ members: [], total: 0 })
    await older

    const { members } = store.getState().organization
    expect(members.rows).toEqual([{ uid: 'p-durand' }])
    expect(members.total).toBe(1)
    expect(members.loading).toBe(false)
    expect(members.error).toBeNull()
  })
})
