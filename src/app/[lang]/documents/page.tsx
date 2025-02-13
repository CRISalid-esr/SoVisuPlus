'use client'

import { TabFilter } from '@/components/TabFilter'
import useStore from '@/stores/global_store'
import { Contribution } from '@/types/Contribution'
import { Document } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { getLocalizedValue } from '@/utils/getLocalizedValue'
import * as Lingui from '@lingui/core'
import { t, Trans } from '@lingui/macro'
import ArticleIcon from '@mui/icons-material/Article'
import SyncIcon from '@mui/icons-material/Sync'
import { Box, Button, Chip, Typography } from '@mui/material'
import { useTheme } from '@mui/system'
import {
  MaterialReactTable,
  MRT_Column,
  MRT_ColumnDef,
  MRT_ColumnFiltersState,
  MRT_Localization,
  MRT_SortingState,
} from 'material-react-table'
import { useEffect, useMemo, useState } from 'react'
import Highlighter from 'react-highlight-words'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { MRT_Localization_FR } from 'material-react-table/locales/fr'
import { MRT_Localization_EN } from 'material-react-table/locales/en'
import Image from 'next/image'
import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
} from '@/types/BibliographicPlatform'
import { DatePicker } from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const localization: Record<string, MRT_Localization> = {
  fr: MRT_Localization_FR,
  en: MRT_Localization_EN,
}

export default function DocumentsPage() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<MRT_SortingState>([])
  const { currentPerspective } = useStore((state) => state.user)
 
  const lang = Lingui.i18n.locale as 'fr' | 'en'

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

  const columns = useMemo<MRT_ColumnDef<Document>[]>(
    () => [
      {
        accessorKey: 'type',
        header: t`documents_page_type_column`,
        Cell() {
          return <ArticleIcon />
        },
      },
      {
        filterColumn: 'titles',
        accessorKey: `titles`,
        accessorFn: (row) => {
          return row.titles
        },
        header: t`documents_page_title_column`,
        Cell({
          row,
          column,
        }: {
          row: { original: { titles: Array<Literal> } }
          column: MRT_Column<Document>
        }) {
          const titles = row.original.titles
          const localizedTitle = getLocalizedValue(
            titles,
            lang,
            ['fr', 'en', 'es', 'ul'],
            t`no_title_available`,
          )
          const filterValue = column.getFilterValue()
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Highlighter
                highlightClassName='highlight'
                searchWords={[globalFilter, filterValue as string]}
                autoEscape
                textToHighlight={localizedTitle}
              />
              <Box>
                <Chip
                  size='small'
                  sx={{
                    marginRight: theme.spacing(1),
                  }}
                  label='FR'
                />
                <Chip size='small' label='EN' />
              </Box>
            </Box>
          )
        },
      },
      {
        accessorFn: (row) => {
          return row.contributions
        },
        accessorKey: 'contributions',
        header: t`documents_page_contributors_column`,
        Cell({
          row,
          column,
        }: {
          row: { original: { contributions: Array<Contribution> } }
          column: MRT_Column<Document>
        }) {
          const contributors = row.original.contributions.reduce(
            (acc: string, contribution: Contribution) => {
              const person = contribution.person
              const { firstName, lastName } = person
              let name = [firstName, lastName].filter(Boolean).join(' ')
              if (name.match(/^\s*$/)) {
                name = person.displayName
              }
              if (name) {
                if (acc) {
                  return `${acc}, ${name}`
                }
                return name
              }

              return acc
            },
            '',
          )
          const filterValue = column.getFilterValue()

          return (
            <Highlighter
              highlightClassName='highlight'
              searchWords={[globalFilter, filterValue as string]}
              autoEscape
              textToHighlight={contributors}
            />
          )
        },
      },
      {
        accessorKey: 'date',
        header: 'Publication Date',
        Cell({ row }) {
          return row.original.publicationDate
        },
        filterVariant: 'date-range',
      },
      {
        accessorKey: 'publishedIn',
        header: t`documents_page_publishedIn_column`,
        Cell() {
          return ''
        },
      },
      {
        accessorKey: 'halStatus',
        header: t`documents_page_halStatus_column`,
        Cell() {
          return ''
        },
      },
      {
        accessorKey: 'version',
        header: t`documents_page_source_column`,
        Cell({ row }: { row: { original: Document } }) {
          const orderedPlatforms = Object.values(BibliographicPlatform)

          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {orderedPlatforms.reduce<JSX.Element[]>((acc, platform) => {
                const record = row.original.records.find(
                  (record) => record.platform === platform,
                )
                if (record) {
                  const metadata =
                    BibliographicPlatformMetadata[record.platform]
                  acc.push(
                    <Image
                      key={record.platform}
                      src={metadata?.icon || '/icons/default.png'}
                      alt={metadata?.name || 'Unknown Source'}
                      width={24}
                      height={24}
                      priority
                      title={metadata?.name || 'Unknown Source'} // Tooltip on hover
                    />,
                  )
                }
                return acc
              }, [])}
            </Box>
          )
        },
      },
    ],
    [lang, globalFilter],
  )

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
      searchLang: lang,
      columnFilters: JSON.stringify(columnFilters),
      sorting: JSON.stringify(sorting),
      contributorUid: currentPerspective?.uid || '',
    }).catch((error) => {
      console.error('Error fetching documents:', error)
    })
  }, [
    columnFilters,
    globalFilter,
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
    lang,
    fetchDocuments,
    currentPerspective,
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
            {/*dislay name of the agent in the current perspective */}
            <Trans>documents_page_main_title</Trans> :{' '}
            {currentPerspective?.getDisplayName(lang as ExtendedLanguageCode)}
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
        columns={columns}
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
        localization={localization[lang]}
      />
    </Box>
  )
}
