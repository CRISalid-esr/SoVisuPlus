'use client'

import { t } from '@lingui/core/macro'
import * as Lingui from '@lingui/core'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import TableChartIcon from '@mui/icons-material/TableChart'
import TableRowsIcon from '@mui/icons-material/TableRows'
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Switch,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme, Theme } from '@mui/material/styles'
import {
  MaterialReactTable,
  MRT_ColumnDef,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFiltersButton,
  MRT_ToggleFullScreenButton,
  MRT_ToggleGlobalFilterButton,
  useMaterialReactTable,
} from 'material-react-table'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import useStore from '@/stores/global_store'
import { Localization } from '@/types/Localization'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import {
  buildDirectoryForest,
  buildRows,
  filterVisible,
  StructureRow,
} from './components/directoryRows'
import RateBar from './components/RateBar'
import StructureNameCell from './components/StructureNameCell'
import StructureTreeExplorer from './components/StructureTreeExplorer'

function exportToCsv(rows: StructureRow[]) {
  const headers = [
    t`research_structures_column_structure`,
    t`research_structures_csv_name`,
    t`research_structures_csv_type`,
    t`research_structures_column_institutions`,
    t`research_structures_column_members`,
    t`research_structures_column_publications`,
    'OA %',
    'HAL %',
  ]
  const lines = rows.map((row) =>
    [
      row.acronym,
      `"${row.name.replace(/"/g, '""')}"`,
      row.nationalType ?? row.category,
      `"${row.institutionNames.join(' / ')}"`,
      row.membersCount,
      row.publicationsCount,
      row.oaRate,
      row.halRate,
    ].join(';'),
  )
  const csv = '﻿' + [headers.join(';'), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'research-structures.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const kpiColumns = (theme: Theme): MRT_ColumnDef<StructureRow>[] => [
  {
    accessorKey: 'membersCount',
    header: t`research_structures_column_members`,
    size: 100,
    muiTableHeadCellProps: { align: 'right' },
    muiTableBodyCellProps: { align: 'right' },
    Cell({ row }) {
      return (
        <Typography variant='body2' fontWeight='bold'>
          {row.original.membersCount.toLocaleString(Lingui.i18n.locale)}
        </Typography>
      )
    },
  },
  {
    accessorKey: 'publicationsCount',
    header: t`research_structures_column_publications`,
    size: 120,
    muiTableHeadCellProps: { align: 'right' },
    muiTableBodyCellProps: { align: 'right' },
    Cell({ row }) {
      return (
        <Tooltip title={t`research_structures_publications_tooltip`}>
          <Typography variant='body2' fontWeight='bold'>
            {row.original.publicationsCount > 0
              ? row.original.publicationsCount.toLocaleString(
                  Lingui.i18n.locale,
                )
              : '—'}
          </Typography>
        </Tooltip>
      )
    },
  },
  {
    accessorKey: 'oaRate',
    header: 'OA',
    size: 120,
    Cell({ row }) {
      return (
        <RateBar
          value={row.original.oaRate}
          color={theme.palette.success.main}
        />
      )
    },
  },
  {
    accessorKey: 'halRate',
    header: 'HAL',
    size: 120,
    Cell({ row }) {
      return (
        <RateBar
          value={row.original.halRate}
          color={theme.palette.primary.main}
        />
      )
    },
  },
]

const dashboardColumn = (
  onNavigate: (row: StructureRow) => void,
): MRT_ColumnDef<StructureRow> => ({
  id: 'dashboard',
  header: '',
  enableSorting: false,
  enableColumnFilter: false,
  size: 120,
  Cell({ row }) {
    if (!row.original.slug) {
      return null
    }
    return (
      <Button
        size='small'
        variant='text'
        onClick={() => onNavigate(row.original)}
      >
        {t`research_structures_dashboard_link`}
      </Button>
    )
  },
})

function FlatTable({
  data,
  lang,
  theme,
  onNavigate,
}: {
  data: StructureRow[]
  lang: ExtendedLanguageCode
  theme: Theme
  onNavigate: (row: StructureRow) => void
}) {
  const allInstitutions = useMemo(
    () => [...new Set(data.flatMap((row) => row.institutionNames))].sort(),
    [data],
  )

  const columns = useMemo<MRT_ColumnDef<StructureRow>[]>(
    () => [
      {
        accessorKey: 'acronym',
        header: t`research_structures_column_structure`,
        size: 260,
        grow: 2,
        filterFn: (row, _id, filterValue: string) => {
          const query = filterValue.toLowerCase()
          return (
            row.original.acronym.toLowerCase().includes(query) ||
            row.original.name.toLowerCase().includes(query)
          )
        },
        Cell({ row }) {
          return (
            <StructureNameCell row={row.original} onNavigate={onNavigate} />
          )
        },
      },
      {
        accessorKey: 'institutionNames',
        header: t`research_structures_column_institutions`,
        size: 200,
        grow: 1,
        accessorFn: (row) => row.institutionNames.join(', '),
        filterVariant: 'multi-select',
        filterSelectOptions: allInstitutions,
        filterFn: (row, _id, filterValue: string[]) => {
          if (!filterValue || filterValue.length === 0) return true
          return row.original.institutionNames.some((institution) =>
            filterValue.includes(institution),
          )
        },
        Cell({ row }) {
          return (
            <Typography variant='body2'>
              {row.original.institutionNames.join(', ') || '—'}
            </Typography>
          )
        },
      },
      ...kpiColumns(theme),
      dashboardColumn(onNavigate),
    ],
    [theme, allInstitutions, onNavigate],
  )

  const table = useMaterialReactTable({
    columns,
    data,
    enableColumnResizing: true,
    enablePagination: true,
    enableRowSelection: true,
    enableGlobalFilter: true,
    enableColumnFilters: true,
    layoutMode: 'grid',
    localization: Localization[lang],
    initialState: {
      showColumnFilters: false,
      pagination: { pageIndex: 0, pageSize: 25 },
    },
    muiSelectCheckboxProps: { color: 'secondary' },
    muiTablePaperProps: { sx: { width: '100%' } },
    muiTableContainerProps: { sx: { width: '100%' } },
    renderToolbarInternalActions: ({ table }) => (
      <Box>
        <MRT_ToggleGlobalFilterButton table={table} />
        <MRT_ToggleFiltersButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
        <MRT_ToggleFullScreenButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
        <Tooltip title={t`research_structures_reset_filters`}>
          <span>
            <Button
              size='small'
              sx={{ minWidth: 0, px: 1 }}
              onClick={() => table.resetColumnFilters()}
            >
              <FilterAltOffIcon fontSize='small' />
            </Button>
          </span>
        </Tooltip>
      </Box>
    ),
  })

  return <MaterialReactTable table={table} />
}

function TreeTable({
  data,
  includeExternal,
  lang,
  theme,
  onNavigate,
}: {
  data: StructureRow[]
  includeExternal: boolean
  lang: ExtendedLanguageCode
  theme: Theme
  onNavigate: (row: StructureRow) => void
}) {
  // The forest is built on the full dataset: the external switch only
  // decides which rows are rendered (with orphan promotion), not the
  // topology.
  const treeData = useMemo(
    () => buildDirectoryForest(data, includeExternal),
    [data, includeExternal],
  )

  const columns = useMemo<MRT_ColumnDef<StructureRow>[]>(
    () => [
      {
        accessorKey: 'acronym',
        header: t`research_structures_column_structure`,
        size: 300,
        grow: 2,
        Cell({ row }) {
          return (
            <StructureNameCell row={row.original} onNavigate={onNavigate} />
          )
        },
      },
      ...kpiColumns(theme),
      dashboardColumn(onNavigate),
    ],
    [theme, onNavigate],
  )

  const table = useMaterialReactTable({
    columns,
    data: treeData,
    enableExpanding: true,
    // closed by default, opened level by level (no expand-all shortcut)
    enableExpandAll: false,
    getSubRows: (row) => row.subRows,
    getRowId: (row) => row.uid,
    // Own the chevron so MRT's built-in rotation doesn't stack on ours:
    // points down when open, right when closed; disabled rows keep the closed
    // orientation (getIsExpanded() is false).
    muiExpandButtonProps: ({ row }) => ({
      children: (
        <ExpandMoreIcon
          sx={{
            transition: 'transform 0.2s',
            transform: row.getIsExpanded() ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      ),
    }),
    enableColumnResizing: true,
    enablePagination: false,
    enableGlobalFilter: true,
    enableColumnFilters: false,
    layoutMode: 'grid',
    localization: Localization[lang],
    initialState: {
      expanded: {},
    },
    muiTablePaperProps: { sx: { width: '100%' } },
    muiTableContainerProps: { sx: { width: '100%', maxHeight: '70vh' } },
    enableStickyHeader: true,
    renderToolbarInternalActions: ({ table }) => (
      <Box>
        <MRT_ToggleGlobalFilterButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
        <MRT_ToggleFullScreenButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
      </Box>
    ),
  })

  return <MaterialReactTable table={table} />
}

const ResearchStructuresPage = () => {
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const theme = useTheme()
  const router = useRouter()
  const [tab, setTab] = useState(0)
  const [includeExternal, setIncludeExternal] = useState(false)

  const { directory, fetchDirectory } = useStore((state) => state.organization)

  useEffect(() => {
    fetchDirectory().catch((error) => {
      console.error('Error fetching the structures directory:', error)
    })
  }, [fetchDirectory])

  const rows = useMemo(
    () => buildRows(directory.structures, lang),
    [directory.structures, lang],
  )
  const visibleRows = useMemo(
    () => filterVisible(rows, includeExternal),
    [rows, includeExternal],
  )

  const navigateToDashboard = useCallback(
    (row: StructureRow) => {
      if (row.slug) {
        router.push(`/${lang}/dashboard?perspective=${row.slug}`)
      }
    },
    [lang, router],
  )

  const tableProps = {
    lang,
    theme,
    onNavigate: navigateToDashboard,
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant='h4'>{t`research_structures_page_title`}</Typography>
        <Button
          startIcon={<FileDownloadIcon />}
          variant='outlined'
          onClick={() => exportToCsv(visibleRows)}
        >
          {t`research_structures_export`}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={includeExternal}
              onChange={(_, checked) => setIncludeExternal(checked)}
              size='small'
            />
          }
          label={t`research_structures_switch_include_external`}
        />
        <Tooltip title={t`research_structures_switch_display_old_tooltip`}>
          {/* Frozen fake control: activates once the graph exposes structure lifecycle data */}
          <FormControlLabel
            control={<Switch checked={false} disabled size='small' />}
            label={t`research_structures_switch_display_old`}
          />
        </Tooltip>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          icon={<AccountTreeIcon fontSize='small' />}
          iconPosition='start'
          label={t`research_structures_tab_tree`}
        />
        <Tab
          icon={<TableRowsIcon fontSize='small' />}
          iconPosition='start'
          label={t`research_structures_tab_flat`}
        />
        <Tab
          icon={<TableChartIcon fontSize='small' />}
          iconPosition='start'
          label={t`research_structures_tab_hierarchical`}
        />
      </Tabs>

      {directory.loading && !directory.loaded ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {tab === 0 && (
            <StructureTreeExplorer
              data={rows}
              includeExternal={includeExternal}
              onNavigate={navigateToDashboard}
            />
          )}
          {tab === 1 && <FlatTable data={visibleRows} {...tableProps} />}
          {tab === 2 && (
            <TreeTable
              data={rows}
              includeExternal={includeExternal}
              {...tableProps}
            />
          )}
        </>
      )}
    </Box>
  )
}

export default ResearchStructuresPage
