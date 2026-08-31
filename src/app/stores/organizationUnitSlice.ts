import { StateCreator } from 'zustand'
import {
  OrganizationUnit,
  OrganizationUnitJson,
} from '@/types/OrganizationUnit'
import { OrganizationGroup, ORGANIZATION_GROUPS } from '@/types/IAgent'
import { OrganizationDirectoryEntry } from '@/types/OrganizationDirectory'
import { StructureMemberJson } from '@/types/StructureMember'
import { i18n } from '@lingui/core'
import { BaseQuery } from '@/types/BaseQuery'
import { toQueryString } from '@/utils/query'

export interface OrganizationsByNameQuery extends BaseQuery {
  searchTerm: string
  group: OrganizationGroup
}

interface OrganizationGroupState {
  organizations: OrganizationUnit[]
  loading: boolean
  total: number
  hasMore: boolean
}

const emptyGroupState = (): OrganizationGroupState => ({
  organizations: [],
  loading: false,
  total: 0,
  hasMore: true,
})

const initialByGroup = (): Record<OrganizationGroup, OrganizationGroupState> =>
  Object.fromEntries(
    ORGANIZATION_GROUPS.map((group) => [group, emptyGroupState()]),
  ) as Record<OrganizationGroup, OrganizationGroupState>

interface DirectoryState {
  structures: OrganizationDirectoryEntry[]
  loading: boolean
  loaded: boolean
  error: string | null
  /** Whether the loaded payload includes the hidden structures. */
  includeHidden: boolean
}

export interface StructureMembersQueryParams {
  uid: string
  page: number
  pageSize: number
  present: boolean
  search: string
  sortBy: string
  sortDesc: boolean
}

interface StructureMembersState {
  rows: StructureMemberJson[]
  total: number
  loading: boolean
  error: string | null
}

export interface OrganizationUnitSlice {
  organization: {
    byGroup: Record<OrganizationGroup, OrganizationGroupState>
    error: string | null | unknown
    fetchOrganizationsByName: (obj: OrganizationsByNameQuery) => Promise<void>
    directory: DirectoryState
    /**
     * Fetched once and reused; pass force to refetch explicitly, or a
     * different includeHidden to switch payloads (the server only honours it
     * for structure managers).
     */
    fetchDirectory: (options?: {
      force?: boolean
      includeHidden?: boolean
    }) => Promise<void>
    /**
     * Show or hide a structure, then reload the directory so the cascade the
     * server computed is reflected.
     */
    setStructureHidden: (uid: string, hidden: boolean) => Promise<void>
    /** Members of the structure currently shown in the detail panel. */
    members: StructureMembersState
    fetchStructureMembers: (query: StructureMembersQueryParams) => Promise<void>
  }
}

export const addOrganizationUnitSlice: StateCreator<
  OrganizationUnitSlice, // The type of the state
  [], // Middlewares (if any)
  [], // Additional options (if any)
  OrganizationUnitSlice // The slice being created
> = (set, get) => ({
  organization: {
    byGroup: initialByGroup(),
    error: null,
    directory: {
      structures: [],
      loading: false,
      loaded: false,
      error: null,
      includeHidden: false,
    },
    fetchDirectory: async (options?: {
      force?: boolean
      includeHidden?: boolean
    }) => {
      const { directory } = get().organization
      const includeHidden = options?.includeHidden ?? directory.includeHidden
      const upToDate =
        directory.loaded && directory.includeHidden === includeHidden
      if (directory.loading || (upToDate && !options?.force)) {
        return
      }
      const setDirectory = (directoryState: Partial<DirectoryState>) =>
        set((state) => ({
          organization: {
            ...state.organization,
            directory: { ...state.organization.directory, ...directoryState },
          },
        }))

      setDirectory({ loading: true, error: null })
      try {
        const response = await fetch(
          `/api/organizations/directory${includeHidden ? '?includeHidden=true' : ''}`,
          { headers: { 'accept-language': i18n.locale } },
        )
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`)
        }
        const jsonData = (await response.json()) as {
          structures: OrganizationDirectoryEntry[]
        }
        setDirectory({
          structures: jsonData.structures,
          loaded: true,
          includeHidden,
        })
      } catch (error) {
        setDirectory({
          structures: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        setDirectory({ loading: false })
      }
    },
    setStructureHidden: async (uid: string, hidden: boolean) => {
      const response = await fetch(
        `/api/organizations/${encodeURIComponent(uid)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hidden }),
        },
      )
      if (!response.ok) {
        throw new Error(`Failed to update visibility: ${response.statusText}`)
      }
      // Hiding cascades server-side, so the whole payload has to come back.
      await get().organization.fetchDirectory({ force: true })
    },
    members: {
      rows: [],
      total: 0,
      loading: false,
      error: null,
    },
    fetchStructureMembers: async (query: StructureMembersQueryParams) => {
      const setMembers = (membersState: Partial<StructureMembersState>) =>
        set((state) => ({
          organization: {
            ...state.organization,
            members: { ...state.organization.members, ...membersState },
          },
        }))

      setMembers({ loading: true, error: null })
      try {
        const { uid, ...params } = query
        const queryString = new URLSearchParams(
          Object.entries(params).map(([key, value]) => [key, String(value)]),
        ).toString()
        const response = await fetch(
          `/api/organizations/${encodeURIComponent(uid)}/members?${queryString}`,
          { headers: { 'accept-language': i18n.locale } },
        )
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`)
        }
        const jsonData = (await response.json()) as {
          members: StructureMemberJson[]
          total: number
        }
        setMembers({ rows: jsonData.members, total: jsonData.total })
      } catch (error) {
        setMembers({
          rows: [],
          total: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        setMembers({ loading: false })
      }
    },
    fetchOrganizationsByName: async (queryObject: OrganizationsByNameQuery) => {
      const { group } = queryObject
      const queryString = toQueryString(queryObject)

      const setGroupState = (
        state: OrganizationUnitSlice,
        groupState: Partial<OrganizationGroupState>,
      ) => ({
        organization: {
          ...state.organization,
          byGroup: {
            ...state.organization.byGroup,
            [group]: {
              ...state.organization.byGroup[group],
              ...groupState,
            },
          },
        },
      })

      set((state) => setGroupState(state, { loading: true }))

      try {
        const response = await fetch(`/api/organizations?${queryString}`, {
          headers: {
            'accept-language': i18n.locale,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`)
        }

        const jsonData = (await response.json()) as {
          hasMore: boolean
          organizations: OrganizationUnitJson[]
          total: number
        }
        const { hasMore, organizations, total } = jsonData

        set((state) => {
          const reinit = Number(queryObject.page) === 1
          let updatedOrganizations = organizations.map(
            OrganizationUnit.fromJson,
          )

          if (!reinit) {
            // Push data to a transient map to avoid duplicates
            const combinedOrganizationMap = new Map<string, OrganizationUnit>([
              ...state.organization.byGroup[group].organizations.map(
                (org): [string, OrganizationUnit] => [org.uid, org],
              ),
              ...organizations.map((org): [string, OrganizationUnit] => [
                org.uid,
                OrganizationUnit.fromJson(org),
              ]),
            ])
            updatedOrganizations = Array.from(combinedOrganizationMap.values())
          }

          return {
            organization: {
              ...setGroupState(state, {
                organizations: updatedOrganizations,
                hasMore,
                total,
              }).organization,
              error: null,
            },
          }
        })
      } catch (error) {
        set((state) => ({
          organization: {
            ...setGroupState(state, { organizations: [] }).organization,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }))
      } finally {
        set((state) => setGroupState(state, { loading: false }))
      }
    },
  },
})
