'use client'
import './page.css'
import { TabFilter } from '@/components/TabFilter'
import useStore from '@/stores/global_store'
import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
} from '@/types/BibliographicPlatform'
import { Contribution } from '@/types/Contribution'
import {
  Document,
  DocumentState,
  DocumentType,
  isDocument,
} from '@/types/Document'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { Literal } from '@/types/Literal'
import { getLocalizedValue } from '@/utils/getLocalizedValue'
import * as Lingui from '@lingui/core'
import { t } from '@lingui/macro'

import { LanguageChips } from '@/components/LanguageChips'
import { LocaleDateFormats } from '@/types/LocaleDateFormats'
import { Localization } from '@/types/Localization'
import InfoIcon from '@mui/icons-material/Info'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import {
  MaterialReactTable,
  MRT_ActionMenuItem,
  MRT_Column,
  MRT_ColumnDef,
  MRT_ColumnFiltersState,
  MRT_SortingState,
  MRT_VisibilityState,
} from 'material-react-table'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation' // Import useRouter
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Highlighter from 'react-highlight-words'
import DocumentHeader from './components/DocumentHeader'
import HalStatusCell from './components/HalStatusCell'
import HalStatusCellBadge, {
  HalStatusCellType,
} from './components/HalStatusCellBadge'
import { DocumentTypeIcons } from './components/DocumentTypeIcons'
import { DocumentTypeLabels } from './components/DocumentTypeLabels'
import SyncIcon from '@mui/icons-material/Sync'
import HighlighterWithEllipsis from '@/app/[lang]/documents/components/HighlighterWithEllipsis'
import DocumentSyncDialog from '@/app/[lang]/documents/components/documentsSyncModal/DocumentSyncDialog'
import { Trans, useLingui } from '@lingui/react'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { Can } from '@casl/react'
import { toUTCISOString } from '@/utils/toUTCISOString'

dayjs.extend(utc)

const DEFAULT_SORTING = [
  {
    id: 'date',
    desc: true,
  },
]
const DEFAULT_PAGINATION = {
  pageIndex: 0,
  pageSize: 10,
}
export default function DocumentsPage() {
  const { data: session } = useSession()
  const { _ } = useLingui()
  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user.authz),
    [session?.user?.authz],
  )
  const readInitialPagination = (): typeof DEFAULT_PAGINATION => {
    try {
      const raw = sessionStorage.getItem('mrt_pagination_publication_table')
      return raw ? JSON.parse(raw) : DEFAULT_PAGINATION
    } catch {
      return DEFAULT_PAGINATION
    }
  }
  const readInitialColumnFilters = (): MRT_ColumnFiltersState => {
    try {
      const raw = sessionStorage.getItem('mrt_columnFilters_publication_table')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  const readInitialGlobalFilter = () => {
    try {
      const raw = sessionStorage.getItem('mrt_global_publication_table')
      return raw ? (JSON.parse(raw) as string) : ''
    } catch {
      return ''
    }
  }
  const [pagination, setPagination] = useState(readInitialPagination)

  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>(
    readInitialColumnFilters,
  )
  const [globalFilter, setGlobalFilter] = useState(readInitialGlobalFilter)

  const readInitialSorting = (): MRT_SortingState => {
    try {
      const raw = sessionStorage.getItem('mrt_sorting_publication_table')
      return raw ? JSON.parse(raw) : DEFAULT_SORTING
    } catch {
      return DEFAULT_SORTING
    }
  }
  const [sorting, setSorting] = useState<MRT_SortingState>(readInitialSorting)

  const [openSynchronizeModal, setOpenSynchronizeModal] =
    useState<boolean>(false)
  const [triggerReloadList, setTriggerReloadList] = useState<boolean>(false)
  const { currentPerspective, ownPerspective } = useStore((state) => state.user)
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const supportedLocales = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')

  const [selectedTitleLangs, setSelectedTitleLangs] = useState<
    Record<string, string>
  >({})

  const harvestings = useStore((state) => state.harvesting.harvestings)
  const currentPerspectiveHarvesting =
    harvestings[currentPerspective?.uid || '']
  const isAnyHarvestingRunning = Object.values(
    currentPerspectiveHarvesting || {},
  ).some((h) => h?.status === 'running')

  const theme = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    sessionStorage.setItem(
      'mrt_pagination_publication_table',
      JSON.stringify(pagination),
    )
  }, [pagination])

  useEffect(() => {
    if (!sorting) return
    sessionStorage.setItem(
      'mrt_sorting_publication_table',
      JSON.stringify(sorting),
    )
  }, [sorting])

  useEffect(() => {
    const id = setTimeout(() => {
      sessionStorage.setItem(
        'mrt_columnFilters_publication_table',
        JSON.stringify(columnFilters),
      )
    }, 250)
    return () => clearTimeout(id)
  }, [columnFilters])

  useEffect(() => {
    const id = setTimeout(() => {
      sessionStorage.setItem(
        'mrt_global_publication_table',
        JSON.stringify(globalFilter),
      )
    }, 250)
    return () => clearTimeout(id)
  }, [globalFilter])

  const navigateToDetailsPage = useCallback(
    (documentUid: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', 'bibliographic_information')
      router.push(`/${lang}/documents/${documentUid}?${params.toString()}`)
    },
    [lang, router, searchParams],
  )

  const columns = useMemo<
    MRT_ColumnDef<Document>[]
  >((): MRT_ColumnDef<Document>[] => {
    const acronyms = currentPerspective?.membershipAcronyms || []

    return [
      {
        enableSorting: false,
        accessorKey: 'type',
        header: t`documents_page_type_column`,
        Cell({ row }: { row: { original: { documentType: DocumentType } } }) {
          return (
            <Tooltip title={_(DocumentTypeLabels[row.original.documentType])}>
              {DocumentTypeIcons[row.original.documentType]}
            </Tooltip>
          )
        },
        filterVariant: 'multi-select',
        filterColumn: 'type',
        //@ts-expect-error:  overide filterSelectOptions to accept Element.jsx instead of Element
        filterSelectOptions: Object.values(DocumentType).map((type) => ({
          value: type,
          label: (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              {_(DocumentTypeLabels[type])}
              <Box
                sx={{
                  marginLeft: 'auto',
                }}
              >
                {DocumentTypeIcons[type]}
              </Box>
            </Box>
          ),
        })),
      },
      {
        size: 200,
        accessorKey: `titles`,
        accessorFn: (row) => {
          return row.titles
        },
        header: t`documents_page_title_column`,
        Cell({
          row,
          column,
        }: {
          row: {
            original: {
              titles: Array<Literal>
              uid: string
              state: DocumentState
            }
          }
          column: MRT_Column<Document>
        }) {
          const { titles, uid, state } = row.original
          const isWaiting = state == DocumentState.waiting_for_update
          const preferredRowLang = selectedTitleLangs[uid] || lang
          const localizedTitle = getLocalizedValue(
            titles,
            preferredRowLang,
            supportedLocales,
            t`no_title_available`,
          )
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Box
                onClick={() => {
                  if (isWaiting) return
                  const documentUid = row.original.uid
                  navigateToDetailsPage(documentUid)
                }}
                sx={{
                  cursor: isWaiting ? 'progress' : 'pointer',
                  color: 'primary.main',
                  textDecoration: 'none',
                  '&:hover': {
                    color: 'primary.dark',
                  },
                }}
              >
                <Highlighter
                  highlightClassName='highlight'
                  searchWords={[
                    globalFilter,
                    column.getFilterValue() as string,
                  ]}
                  autoEscape
                  textToHighlight={localizedTitle.value}
                />
              </Box>
              <LanguageChips
                texts={titles}
                selectedLang={localizedTitle.language}
                onLanguageSelect={(newLang) =>
                  setSelectedTitleLangs((prev) => ({
                    ...prev,
                    [uid]: newLang,
                  }))
                }
              />
            </Box>
          )
        },
      },
      {
        enableSorting: false,
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
          const contributors = row.original.contributions
            .map((contribution: Contribution) => {
              const person = contribution.person
              const { firstName, lastName } = person
              let name = [firstName, lastName].filter(Boolean).join(' ')
              if (name.match(/^\s*$/)) {
                name = person.getDisplayName()
              }
              return name
            })
            .filter(Boolean)
            .join(', ')
          const filterValue = column.getFilterValue()

          return (
            <HighlighterWithEllipsis
              searchWords={[globalFilter, filterValue as string]}
              text={contributors}
            />
          )
        },
      },
      {
        size: 100,
        accessorKey: 'date',
        header: t`documents_page_publication_date_column`,
        Cell({ row }: { row: { original: Document } }) {
          const dateStr = row.original?.publicationDate
          if (!dateStr) {
            return t`documents_page_publication_date_column_no_date_available`
          }
          const dateFormat = LocaleDateFormats['lang'] || 'MM-DD-YYYY'
          if (!dayjs(dateStr, 'YYYY-MM-DD').isValid()) {
            return (
              <Highlighter
                highlightClassName='highlight'
                searchWords={[globalFilter]}
                autoEscape
                textToHighlight={dateStr}
              />
            )
          }
          const localizedDate = dayjs(dateStr, 'YYYY-MM-DD').format(dateFormat)

          return (
            <Highlighter
              highlightClassName='highlight'
              searchWords={[globalFilter]}
              autoEscape
              textToHighlight={localizedDate}
            />
          )
        },
        filterVariant: 'date-range',
      },
      {
        accessorKey: 'publishedIn',
        header: t`documents_page_publishedIn_column`,
        Cell({ row, column }) {
          const { journal } = row.original
          const title = journal?.title

          return (
            title && (
              <Highlighter
                highlightClassName='highlight'
                searchWords={[globalFilter, column.getFilterValue() as string]}
                autoEscape
                textToHighlight={title}
              />
            )
          )
        },
      },
      {
        enableSorting: false,
        accessorKey: 'halStatus',
        header: t`documents_page_halStatus_column`,
        Cell({ row }) {
          return <HalStatusCell row={row} />
        },
        filterVariant: 'multi-select',
        filterSelectOptions: [
          {
            // @ts-expect-error: so that label accepts an Element
            label: (
              <HalStatusCellBadge
                type={HalStatusCellType.InCollection}
                isSingleLine
              />
            ),
            value: 'in_collection',
          },
          {
            // @ts-expect-error: so that label accepts an Element
            label: (
              <HalStatusCellBadge
                type={HalStatusCellType.OutOfCollection}
                acronyms={acronyms}
                isSingleLine
              />
            ),
            value: 'out_of_collection',
          },
          {
            // @ts-expect-error: so that label accepts an Element
            label: (
              <HalStatusCellBadge
                type={HalStatusCellType.OutsideHal}
                isSingleLine
              />
            ),
            value: 'outside_hal',
          },
        ],
      },
      {
        enableSorting: false,
        accessorKey: 'source',
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
              {orderedPlatforms.reduce<ReactElement[]>((acc, platform) => {
                const record = row.original.records.find(
                  (record) => record.platform === platform,
                )
                if (record) {
                  const metadata =
                    BibliographicPlatformMetadata[record.platform]
                  const imageElement = (
                    <Image
                      src={metadata?.icon || '/icons/default.png'}
                      alt={metadata?.name || 'Unknown Source'}
                      width={24}
                      height={24}
                      priority
                      title={metadata?.name || 'Unknown Source'} // Tooltip on hover
                    />
                  )

                  acc.push(
                    record.url ? (
                      <IconButton
                        key={record.platform}
                        component='a'
                        href={record.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        sx={{ padding: 0 }}
                      >
                        {imageElement}
                      </IconButton>
                    ) : (
                      <Box key={record.platform}>{imageElement}</Box>
                    ),
                  )
                }
                return acc
              }, [])}
            </Box>
          )
        },
        filterVariant: 'multi-select',
        filterColumn: 'source',
        //@ts-expect-error:  overide filterSelectOptions to accept Element.jsx instead of Element
        filterSelectOptions: Object.values(BibliographicPlatform).map(
          (platform) => {
            const metadata = BibliographicPlatformMetadata[platform]
            return {
              value: platform,
              label: (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                >
                  <Typography>{metadata?.name || platform}</Typography>
                  <Image
                    src={metadata?.icon || '/icons/default.png'}
                    alt={metadata?.name || 'Unknown Source'}
                    width={24}
                    height={24}
                    priority
                  />
                </Box>
              ),
            }
          },
        ),
      },
    ]
  }, [
    lang,
    globalFilter,
    selectedTitleLangs,
    supportedLocales,
    navigateToDetailsPage,
    currentPerspective?.membershipAcronyms,
    _,
  ])

  const getColumnIds = (columns: MRT_ColumnDef<Document>[]) => {
    return columns
      .map((c) => (typeof c.accessorKey === 'string' ? c.accessorKey : c.id))
      .filter(Boolean) as string[]
  }

  const readInitialColumnVisibility = (
    columns: MRT_ColumnDef<Document>[],
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

  const [columnVisibility, setColumnVisibility] = useState<MRT_VisibilityState>(
    () => readInitialColumnVisibility(columns),
  )

  useEffect(() => {
    sessionStorage.setItem(
      'mrt_columnVisibility_publication_table',
      JSON.stringify(columnVisibility),
    )
  }, [columnVisibility])

  const requestIdRef = useRef(0)
  const countDocumentsRequestIdRef = useRef(0)

  const {
    fetchDocuments,
    countDocuments,
    loading,
    documents = [],
    totalItems,
    count: { allItems, incompleteHalRepositoryItems },
    listHasChanged,
    setListHasChanged,
    mergeDocuments,
  } = useStore((state) => state.document)

  const tabs = [
    {
      label: t`documents_page_all_documents_filter`,
      value: 'all_documents',
      numberOfItems: allItems,
      color: theme.palette.primary.main,
    },
    {
      label: t`documents_page_incomplete_hal_repository_filter`,
      value: 'incomplete_hal_repository',
      numberOfItems: incompleteHalRepositoryItems,
      color: theme.palette.error.main,
    },
  ]

  const [selectedTab, setSelectedTab] = useState(tabs[0].value)

  /**
   * Adjust MRT column filters so that `date` range filters are converted to UTC ISO strings.
   */
  const normalizeDateFilters = (
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

  useEffect(() => {
    const adjustedFilters = normalizeDateFilters(columnFilters)
    const contributorType = currentPerspective?.type
    if (!contributorType) return

    const nextRequestId = ++requestIdRef.current
    fetchDocuments({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      searchTerm: globalFilter,
      searchLang: lang,
      columnFilters: JSON.stringify(adjustedFilters), // Use adjusted date filter
      sorting: JSON.stringify(sorting),
      contributorUid: currentPerspective?.uid || '',
      contributorType: contributorType,
      requestId: nextRequestId,
      halCollectionCodes: JSON.stringify(currentPerspective.membershipAcronyms),
      areHalCollectionCodesOmitted: selectedTab === 'incomplete_hal_repository',
    }).catch((error) => {
      console.error('Error fetching documents:', error)
    })

    const nextCountDocumentsRequestId = ++countDocumentsRequestIdRef.current
    countDocuments({
      page: pagination.pageIndex + 1,
      searchTerm: globalFilter,
      searchLang: lang,
      columnFilters: JSON.stringify(adjustedFilters), // Use adjusted date filter
      contributorUid: currentPerspective?.uid || '',
      contributorType: contributorType,
      requestId: nextCountDocumentsRequestId,
      halCollectionCodes: JSON.stringify(currentPerspective.membershipAcronyms),
    }).catch((error) => {
      console.error('Error counting documents:', error)
    })
  }, [
    columnFilters,
    globalFilter,
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
    lang,
    fetchDocuments,
    countDocuments,
    currentPerspective,
    selectedTab,
    triggerReloadList,
  ])

  useEffect(() => {
    const tab = searchParams.get('tab')

    setSelectedTab(tab ?? 'all_documents')
  }, [searchParams])

  const handleTabChange = (newValue: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', newValue)

    router.push(`/${lang}/documents?${params.toString()}`)
  }

  const onMergeDocuments = async (documentUids: string[]) => {
    if (documentUids.length < 2) return
    try {
      await mergeDocuments(documentUids)
      setTriggerReloadList((prev) => !prev)
    } catch (error) {
      console.error('Error merging documents:', error)
    }
  }

  return (
    <Box>
      <DocumentHeader
        perspective={
          currentPerspective?.getDisplayName(lang as ExtendedLanguageCode) || ''
        }
        pageName={
          ownPerspective
            ? t`documents_page_main_title_first_person`
            : t`documents_page_main_title`
        }
      >
        {listHasChanged && (
          <Alert
            severity='info'
            variant='filled'
            className='refresh-alert'
            onClose={() => setListHasChanged(false)}
          >
            <Typography component='span'>
              {ownPerspective && (
                <Trans id='documents_page_refresh_list_alert_own_perspective' />
              )}
              {ownPerspective || (
                <Trans
                  id='documents_page_refresh_list_alert_other_perspective'
                  values={{
                    name:
                      currentPerspective?.getDisplayName(
                        lang as ExtendedLanguageCode,
                      ) || '',
                  }}
                />
              )}
            </Typography>{' '}
            <Link
              component='button'
              onClick={() => {
                setTriggerReloadList((prev) => !prev)
                setListHasChanged(false)
              }}
              underline='always'
              sx={{ ml: 1 }}
            >
              {t`documents_page_refresh_list`}
            </Link>
          </Alert>
        )}

        {currentPerspective && (
          <Can
            I={PermissionAction.fetch_documents}
            a={currentPerspective}
            passThrough
            ability={ability}
          >
            {(allowed: boolean) => (
              <Button
                startIcon={
                  isAnyHarvestingRunning ? (
                    <CircularProgress size={18} thickness={4} />
                  ) : (
                    <SyncIcon />
                  )
                }
                variant='outlined'
                disabled={!allowed}
                onClick={() => setOpenSynchronizeModal(true)}
              >
                <Trans id='documents_page_synchronize_button' />
              </Button>
            )}
          </Can>
        )}
      </DocumentHeader>
      <TabFilter
        tabsData={tabs}
        selectedValue={selectedTab}
        onTabChange={handleTabChange}
      />
      {currentPerspective && (
        <Can
          I={PermissionAction.fetch_documents}
          a={currentPerspective}
          ability={ability}
        >
          <DocumentSyncDialog
            openSynchronizeModal={openSynchronizeModal}
            setOpenSynchronizeModal={setOpenSynchronizeModal}
            personUid={currentPerspective?.uid || ''}
          />
        </Can>
      )}

      <MaterialReactTable<Document>
        initialState={{ showColumnFilters: true }}
        getRowId={(row) => {
          return row.uid
        }}
        manualFiltering
        manualPagination
        manualSorting
        enableColumnResizing
        enableRowSelection={(row) => {
          if (!isDocument(row.original)) return false
          const canMerge = ability.can(PermissionAction.merge, row.original)
          return canMerge && row.original.state == DocumentState.default
        }}
        muiTableBodyRowProps={({ row }) => {
          const isWaiting = row.original.state === 'waiting_for_update'
          return {
            className: isWaiting ? 'mrt-row-waiting' : '',
          }
        }}
        muiSelectCheckboxProps={{ color: 'secondary' }}
        columns={columns}
        rowCount={totalItems}
        data={documents}
        enablePagination
        onPaginationChange={setPagination}
        onColumnFiltersChange={setColumnFilters}
        onGlobalFilterChange={setGlobalFilter}
        onSortingChange={setSorting}
        onColumnVisibilityChange={(newState) => {
          setColumnVisibility(newState)
        }}
        state={{
          isLoading: loading,
          showLoadingOverlay: false,
          pagination,
          sorting: sorting || DEFAULT_SORTING,
          columnFilters,
          globalFilter,
          columnVisibility,
        }}
        localization={Localization[lang]}
        enableRowActions
        positionActionsColumn='last'
        renderTopToolbarCustomActions={({ table }) =>
          table.getSelectedRowModel().rows.length > 0 && (
            <Box sx={{ display: 'flex', gap: '1rem', p: '4px' }}>
              <Button
                color='secondary'
                disabled={table.getSelectedRowModel().rows.length < 2}
                onClick={async () => {
                  await onMergeDocuments(
                    table
                      .getSelectedRowModel()
                      .rows.map((row) => row.original.uid),
                  )
                  table.resetRowSelection()
                }}
                variant='contained'
              >
                {t`documents_page_merge_selected_documents_button`}
              </Button>
            </Box>
          )
        }
        renderRowActionMenuItems={({ row, table }) => {
          const isWaiting =
            row.original.state === DocumentState.waiting_for_update
          if (isWaiting) return []
          return [
            <Box sx={{ display: 'flex' }} key={row.original.uid}>
              <MRT_ActionMenuItem
                icon={<InfoIcon />}
                key='edit'
                label={t`documents_page_action_column_details`}
                onClick={() => {
                  navigateToDetailsPage(row.original.uid)
                }}
                table={table}
              />
            </Box>,
          ]
        }}
      />
    </Box>
  )
}
