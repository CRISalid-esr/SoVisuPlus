'use client'

import { t, Trans } from '@lingui/macro'
import { Box, Button, Typography } from '@mui/material'
import {
  MaterialReactTable,
  MRT_ColumnFiltersState,
  MRT_SortingState,
} from 'material-react-table'
import { useEffect, useMemo, useState } from 'react'
import ArticleIcon from '@mui/icons-material/Article'
import { getLocalizedValue } from '@/utils/getLocalizedValue'
import { TabFilter } from '@/components/TabFilter'
import { useTheme } from '@mui/system'
import SyncIcon from '@mui/icons-material/Sync'
import useStore from '@/stores/global_store'
import * as Lingui from '@lingui/core'
import { Person } from '@/types/Person'
import Highlighter from 'react-highlight-words'

export default function DocumentsPage() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10, // customize the default page size
  })

  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<MRT_SortingState>([])

  const lang = Lingui.i18n.locale

  const columns = [
    {
      accessorKey: 'type',
      header: t`documents_page_type_column`,
      Cell({ row }: { row: { original: { type: string } } }) {
        return <ArticleIcon />
      },
    },
    {
      accessorKey: `titles.${lang}`, // access nested data with dot notation
      header: t`documents_page_title_column`,
      Cell({ row }: { row: { original: { titles: Record<string, string> } } }) {
        const titles = row.original.titles
        const localizedTitle = getLocalizedValue(
          titles,
          lang,
          ['en'],
          t`no_title_available`,
        )
        return (
          <Highlighter
            highlightClassName='highlight'
            searchWords={[globalFilter]}
            autoEscape
            textToHighlight={localizedTitle}
          />
        )
      },
    },
    {
      accessorKey: 'persons',
      header: t`documents_page_contributors_column`,
      Cell({ row }: { row: { original: { contributions: Array<Person> } } }) {
        const contributors = row.original.persons
        return contributors.reduce((acc: string, { person }) => {
          const { firstName, lastName } = person
          const name = [firstName, lastName].filter(Boolean).join(' ')
          if (name) {
            if (acc) {
              return `${acc}, ${name}`
            }
            return name
          }

          return acc
        }, '')
      },
    },
    {
      accessorKey: 'date',
      header: t`documents_page_date_column`,
      Cell({ row }: { row: { original: { type: string } } }) {
        return ''
      },
    },
    {
      accessorKey: 'publishedIn',
      header: t`documents_page_publishedIn_column`,
      Cell({ row }: { row: { original: { doi: string } } }) {
        return ''
      },
    },
    {
      accessorKey: 'halStatus',
      header: t`documents_page_halStatus_column`,
      Cell({ row }: { row: { original: { doi: string } } }) {
        return ''
      },
    },
    {
      accessorKey: 'version',
      header: t`documents_page_version_column`,
      Cell({ row }: { row: { original: { doi: string } } }) {
        return ''
      },
    },
  ]

  const theme = useTheme()

  const tabs = [
    {
      label: t`documents_page_all_documents_filter`,
      value: 'all_documents',
      color: theme.palette.primary.main,
    },
    {
      label: t`documents_page_incomplete_hal_repository_filter`,
      value: 'incomplete_hal_repository',
      numberOfItems: 2,
      color: theme.palette.primary.main,
    },
    {
      label: t`documents_page_keywords_to_validate`,
      value: 'keywords_to_validate',
      numberOfItems: 1,
      color: theme.palette.primary.main,
    },
  ]

  const [selectedTab, setSelectedTab] = useState(tabs[0].value)

  const memoizedColumns = useMemo(() => columns, [columns])

  const {
    fetchDocuments,
    loading,
    documents = [],
    totalItems,
  } = useStore((state) => state.document)

  useEffect(() => {
    fetchDocuments({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      searchTerm: globalFilter,
      columnFilters: JSON.stringify(columnFilters),
      sorting: JSON.stringify(sorting),
      searchLang: lang,
    })
  }, [
    columnFilters,
    globalFilter,
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
  ])

  const handleTabChange = (newValue: string) => {
    setSelectedTab(newValue)
  }

  return (
    <Box>
      <Box
        mb={3}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: {
            xs: 'flex-start',
            md: 'center',
          },
          flexDirection: {
            xs: 'column',
            sm: 'row',
          },
        }}
      >
        <Box>
          <Typography variant='h4' gutterBottom>
            <Trans>documents_page_main_title</Trans>
          </Typography>
        </Box>
        <Button startIcon={<SyncIcon />} variant='outlined'>
          <Trans>documents_page_synchronize_button</Trans>
        </Button>
      </Box>
      <TabFilter
        tabsData={tabs}
        selectedValue={selectedTab}
        onTabChange={handleTabChange}
      />
      <MaterialReactTable
        initialState={{ showColumnFilters: true }}
        manualFiltering
        manualPagination
        manualSorting
        columns={memoizedColumns}
        rowCount={totalItems}
        data={documents}
        enablePagination
        onPaginationChange={setPagination}
        onColumnFiltersChange={setColumnFilters}
        onGlobalFilterChange={setGlobalFilter}
        onSortingChange={setSorting}
        state={{
          isLoading: loading,
          pagination,
          sorting,
          columnFilters,
          globalFilter,
        }}
      />
    </Box>
  )
}
