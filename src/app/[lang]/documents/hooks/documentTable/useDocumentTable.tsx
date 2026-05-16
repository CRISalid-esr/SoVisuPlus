import {
  MRT_ColumnSizingState,
  MRT_RowData,
  MRT_ShowHideColumnsButton,
  MRT_TableInstance,
  MRT_TableOptions,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFiltersButton,
  MRT_ToggleFullScreenButton,
  MRT_ToggleGlobalFilterButton,
  MRT_VisibilityState,
  useMaterialReactTable,
} from 'material-react-table'
import { useCallback, useEffect, useState } from 'react'
import {
  readInitialColumnSizing,
  readInitialColumnVisibility,
} from '@/app/[lang]/documents/hooks/documentTable/utils/persistence'
import { Localization } from '@/types/Localization'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { Box, IconButton } from '@mui/material'
import { FilterAltOff } from '@mui/icons-material'
import * as Lingui from '@lingui/core'

export const useDocumentTable = <T extends MRT_RowData>(
  options: MRT_TableOptions<T>,
) => {
  const { columns, initialState, state } = options

  const renderToolbarInternalActions = useCallback(
    ({ table }: { table: MRT_TableInstance<T> }) => (
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
    ),
    [],
  )

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

  return useMaterialReactTable({
    ...options,
    enableColumnFilters: true,
    enableColumnResizing: true,
    enableStickyHeader: true,
    enablePagination: true,
    enableToolbarInternalActions: true,
    getRowId: (row) => {
      return row.uid
    },
    initialState: {
      ...initialState,
      showColumnFilters: true,
    },
    localization: Localization[Lingui.i18n.locale as ExtendedLanguageCode],
    muiSelectCheckboxProps: { color: 'secondary' },
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: (newState) => {
      setColumnVisibility(newState)
    },
    renderToolbarInternalActions: renderToolbarInternalActions,
    state: {
      ...state,
      showLoadingOverlay: false,
      columnSizing,
      columnVisibility,
    },
  })
}
