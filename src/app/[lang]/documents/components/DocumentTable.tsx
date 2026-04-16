import {
  MaterialReactTable,
  MaterialReactTableProps,
  MRT_ColumnDef,
  MRT_ColumnFiltersState,
  MRT_ColumnSizingState,
  MRT_RowData,
  MRT_ShowHideColumnsButton,
  MRT_SortingState,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFiltersButton,
  MRT_ToggleFullScreenButton,
  MRT_ToggleGlobalFilterButton,
  MRT_VisibilityState,
} from 'material-react-table'
import React, { useEffect, useState } from 'react'
import { Box, IconButton } from '@mui/material'
import { FilterAltOff } from '@mui/icons-material'
import * as Lingui from '@lingui/core'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { Localization } from '@/types/Localization'
import { toUTCISOString } from '@/utils/toUTCISOString'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { ColumnFilter } from '@tanstack/table-core'

dayjs.extend(utc)

type DocumentTableProps<T extends MRT_RowData> = MaterialReactTableProps<T> & {
  columns: MRT_ColumnDef<T>[]
}

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

/**
 * Adjust MRT column filters so that `date` range filters are converted to UTC ISO strings.
 */
export const normalizeDateFilters = (
  columnFilters: { id: string; value: unknown }[],
): { id: string; value: unknown }[] => {
  return columnFilters.map((filter) => {
    if (filter.id === 'date' && Array.isArray(filter.value)) {
      const [startDate, endDate] = filter.value as (string | null)[]
      return {
        ...filter,
        value: [toUTCISOString(startDate), toUTCISOString(endDate, true)],
      }
    }
    return filter
  })
}

export const DocumentTable = <T extends MRT_RowData>({
  columns,
  initialState,
  state,
  ...props
}: DocumentTableProps<T>) => {
  const lang = Lingui.i18n.locale as ExtendedLanguageCode

  const getColumnIds = (columns: MRT_ColumnDef<T>[]) => {
    return columns
      .map((c) => (typeof c.accessorKey === 'string' ? c.accessorKey : c.id))
      .filter(Boolean) as string[]
  }

  const readInitialColumnSizing = (
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

  const readInitialColumnVisibility = (
    columns: MRT_ColumnDef<T>[],
  ): MRT_VisibilityState => {
    try {
      const raw = sessionStorage.getItem(
        'mrt_columnVisibility_publication_table',
      )
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

  const [columnSizing, setColumnSizing] = useState<MRT_ColumnSizingState>(() =>
    readInitialColumnSizing(columns),
  )
  const [columnVisibility, setColumnVisibility] = useState<MRT_VisibilityState>(
    () => readInitialColumnVisibility(columns),
  )

  useEffect(() => {
    sessionStorage.setItem(
      'mrt_columnSizing_publication_table',
      JSON.stringify(columnSizing),
    )
  }, [columnSizing])

  useEffect(() => {
    sessionStorage.setItem(
      'mrt_columnVisibility_publication_table',
      JSON.stringify(columnVisibility),
    )
  }, [columnVisibility])

  return (
    <MaterialReactTable<T>
      {...props}
      columns={columns}
      enableColumnFilters
      enableColumnResizing
      enableStickyHeader
      enablePagination
      enableToolbarInternalActions
      getRowId={(row) => {
        return row.uid
      }}
      initialState={{
        ...initialState,
        showColumnFilters: true,
      }}
      localization={Localization[lang]}
      muiSelectCheckboxProps={{ color: 'secondary' }}
      onColumnSizingChange={setColumnSizing}
      onColumnVisibilityChange={(newState) => {
        setColumnVisibility(newState)
      }}
      renderToolbarInternalActions={({ table }) => (
        <Box>
          <MRT_ToggleGlobalFilterButton table={table} />
          <MRT_ToggleFiltersButton table={table} />
          <MRT_ToggleDensePaddingButton table={table} />
          <MRT_ToggleFullScreenButton table={table} />
          <MRT_ShowHideColumnsButton table={table} />
          <IconButton onClick={() => table.resetColumnFilters()}>
            <FilterAltOff />
          </IconButton>
        </Box>
      )}
      state={{
        ...state,
        showLoadingOverlay: false,
        columnSizing,
        columnVisibility,
      }}
    />
  )
}
