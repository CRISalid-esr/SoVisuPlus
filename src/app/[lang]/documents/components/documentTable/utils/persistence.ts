import {
  MRT_ColumnDef,
  MRT_ColumnFiltersState,
  MRT_ColumnSizingState,
  MRT_RowData,
  MRT_SortingState,
  MRT_VisibilityState,
} from 'material-react-table'
import { ColumnFilter } from '@tanstack/table-core'
import dayjs from 'dayjs'
import { getColumnIds } from '@/app/[lang]/documents/components/documentTable/utils/columns'

export const DEFAULT_PAGINATION = {
  slug: null,
  pageIndex: 0,
  pageSize: 10,
}

export const DEFAULT_SORTING = [
  {
    id: 'date',
    desc: true,
  },
]

export const readInitialPagination = (): typeof DEFAULT_PAGINATION => {
  try {
    const raw = sessionStorage.getItem('mrt_pagination_publication_table')
    return raw ? JSON.parse(raw) : DEFAULT_PAGINATION
  } catch {
    return DEFAULT_PAGINATION
  }
}

export const readInitialColumnFilters = (): MRT_ColumnFiltersState => {
  try {
    const raw = sessionStorage.getItem('mrt_columnFilters_publication_table')
    if (!raw) return []

    const parsed = JSON.parse(raw)

    return parsed.map((filter: ColumnFilter) => {
      if (filter.id === 'date' && Array.isArray(filter.value)) {
        return {
          ...filter,
          value: filter.value.map((v: string | null) => (v ? dayjs(v) : null)),
        }
      }
      return filter
    })
  } catch {
    return []
  }
}

export const readInitialGlobalFilter = () => {
  try {
    const raw = sessionStorage.getItem('mrt_global_publication_table')
    return raw ? (JSON.parse(raw) as string) : ''
  } catch {
    return ''
  }
}

export const readInitialSorting = (): MRT_SortingState => {
  try {
    const raw = sessionStorage.getItem('mrt_sorting_publication_table')
    return raw ? JSON.parse(raw) : DEFAULT_SORTING
  } catch {
    return DEFAULT_SORTING
  }
}

export const readInitialColumnSizing = <T extends MRT_RowData>(
  columns: MRT_ColumnDef<T>[],
): MRT_ColumnSizingState => {
  try {
    const raw = sessionStorage.getItem('mrt_columnSizing_publication_table')
    if (!raw) return {} // all visible by default
    const parsed = JSON.parse(raw) as MRT_ColumnSizingState
    const valid = new Set(getColumnIds(columns))
    // keep only known columns
    return Object.fromEntries(
      Object.entries(parsed).filter(([id]) => valid.has(id)),
    )
  } catch {
    return {}
  }
}

export const readInitialColumnVisibility = <T extends MRT_RowData>(
  columns: MRT_ColumnDef<T>[],
): MRT_VisibilityState => {
  try {
    const raw = sessionStorage.getItem('mrt_columnVisibility_publication_table')
    if (!raw) return {} // all visible by default
    const parsed = JSON.parse(raw) as MRT_VisibilityState
    const valid = new Set(getColumnIds(columns))
    // keep only known columns
    return Object.fromEntries(
      Object.entries(parsed).filter(([id]) => valid.has(id)),
    )
  } catch {
    return {}
  }
}
