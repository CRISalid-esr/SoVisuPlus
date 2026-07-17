import { StateCreator } from 'zustand'
import {
  OrganizationUnit,
  OrganizationUnitJson,
} from '@/types/OrganizationUnit'
import { OrganizationGroup, ORGANIZATION_GROUPS } from '@/types/IAgent'
import { OrganizationDirectoryEntry } from '@/types/OrganizationDirectory'
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
}

export interface OrganizationUnitSlice {
  organization: {
    byGroup: Record<OrganizationGroup, OrganizationGroupState>
    error: string | null | unknown
    fetchOrganizationsByName: (obj: OrganizationsByNameQuery) => Promise<void>
    directory: DirectoryState
    /** Fetched once and reused; pass force to refetch explicitly. */
    fetchDirectory: (options?: { force?: boolean }) => Promise<void>
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
    },
    fetchDirectory: async (options?: { force?: boolean }) => {
      const { directory } = get().organization
      if (directory.loading || (directory.loaded && !options?.force)) {
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
        const response = await fetch('/api/organizations/directory', {
          headers: { 'accept-language': i18n.locale },
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`)
        }
        const jsonData = (await response.json()) as {
          structures: OrganizationDirectoryEntry[]
        }
        setDirectory({ structures: jsonData.structures, loaded: true })
      } catch (error) {
        setDirectory({
          structures: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        setDirectory({ loading: false })
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
