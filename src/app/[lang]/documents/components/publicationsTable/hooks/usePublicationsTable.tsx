import { DocumentTypeService } from '@/lib/services/DocumentTypeService'
import {
  Document,
  DocumentState,
  DocumentType,
  isDocument,
} from '@/types/Document'
import { DocumentTypeLabels } from '@/app/[lang]/documents/components/DocumentTypeLabels'
import {
  Box,
  Button,
  IconButton,
  Link,
  Tooltip,
  Typography,
} from '@mui/material'
import { DocumentTypeIcons } from '@/app/[lang]/documents/components/DocumentTypeIcons'
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as Lingui from '@lingui/core'
import { useLingui } from '@lingui/react'
import {
  MRT_ActionMenuItem,
  MRT_Column,
  MRT_ColumnDef,
  MRT_ColumnFiltersState,
  MRT_Row,
  MRT_SortingState,
  MRT_TableInstance,
  MRT_TableOptions,
} from 'material-react-table'
import { t } from '@lingui/core/macro'
import { Literal } from '@/types/Literal'
import { getLocalizedValue } from '@/utils/getLocalizedValue'
import NextLink, { LinkProps } from 'next/link'
import Highlighter from 'react-highlight-words'
import { LanguageChips } from '@/components/LanguageChips'
import { Contribution } from '@/types/Contribution'
import HighlighterWithEllipsis from '@/app/[lang]/documents/components/HighlighterWithEllipsis'
import dayjs from 'dayjs'
import { LocaleDateFormats } from '@/types/LocaleDateFormats'
import HalStatusCell from '@/app/[lang]/documents/components/HalStatusCell'
import HalStatusCellBadge, {
  HalStatusCellType,
} from '@/app/[lang]/documents/components/HalStatusCellBadge'
import { HalSubmitType, OAStatus } from '@prisma/client'
import OAStatusCell from '@/app/[lang]/documents/components/OAStatusCell'
import OAStatusCellBadge from '@/app/[lang]/documents/components/OAStatusCellBadge'
import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
} from '@/types/BibliographicPlatform'
import Image from 'next/image'
import { useDocumentTable } from '@/app/[lang]/documents/components/documentTable/hooks/useDocumentTable'
import useStore from '@/stores/global_store'
import { ParsedUrlQueryInput } from 'node:querystring'
import { ReadonlyURLSearchParams, useSearchParams } from 'next/navigation'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import InfoIcon from '@mui/icons-material/Info'
import {
  DEFAULT_PAGINATION,
  readInitialColumnFilters,
  readInitialGlobalFilter,
  readInitialPagination,
  readInitialSorting,
} from '@/app/[lang]/documents/components/documentTable/utils/persistence'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { normalizeDateFilters } from '@/app/[lang]/documents/components/documentTable/utils/columns'

const DEFAULT_SORTING = [
  {
    id: 'date',
    desc: true,
  },
]

const createDocTypeTree = (
  _: (descriptor: Lingui.MessageDescriptor) => string,
) =>
  DocumentTypeService.toMenuTree()
    .filter((n) => n.value !== DocumentType.Document)
    .map(({ value, depth }) => {
      const plainLabel = _(DocumentTypeLabels[value])
      return {
        value,
        label: (
          <Box
            className='doc-type-option'
            sx={{ display: 'flex', alignItems: 'center', pl: depth * 2 }}
          >
            <Box sx={{ mr: 1 }}>{DocumentTypeIcons[value]}</Box>
            <Typography variant='body2' noWrap>
              {plainLabel}
            </Typography>
          </Box>
        ),
        plainLabel,
      }
    })

const detailsPageUrl = (
  documentUid: string,
  searchParams: ReadonlyURLSearchParams,
  lang: ExtendedLanguageCode,
): LinkProps['href'] => {
  const params = new URLSearchParams(searchParams.toString())
  params.set('tab', 'bibliographic_information')
  const query: ParsedUrlQueryInput = {}

  params.forEach((value, key) => {
    query[key] = value
  })

  return {
    pathname: `/${lang}/documents/${documentUid}`,
    query,
  }
}

const usePublicationsTableStorage = (
  globalFilter: string,
  sorting: MRT_SortingState,
  columnFilters: MRT_ColumnFiltersState,
  pagination: {
    pageIndex: number
    pageSize: number
  },
  setPagination: React.Dispatch<
    React.SetStateAction<{
      pageIndex: number
      pageSize: number
    }>
  >,
) => {
  useEffect(() => {
    const id = setTimeout(() => {
      sessionStorage.setItem(
        'mrt_global_publication_table',
        JSON.stringify(globalFilter),
      )
    }, 250)
    return () => clearTimeout(id)
  }, [globalFilter])

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

  const { currentPerspective } = useStore((state) => state.user)

  useEffect(() => {
    const raw = sessionStorage.getItem('mrt_pagination_publication_table')
    if (raw) {
      const data = JSON.parse(raw)
      if (data.slug != currentPerspective?.slug) {
        sessionStorage.setItem(
          'mrt_pagination_publication_table',
          JSON.stringify({
            ...DEFAULT_PAGINATION,
            slug: currentPerspective?.slug,
          }),
        )
        setPagination({
          pageIndex: DEFAULT_PAGINATION.pageIndex,
          pageSize: DEFAULT_PAGINATION.pageSize,
        })
        return
      }
    }
    sessionStorage.setItem(
      'mrt_pagination_publication_table',
      JSON.stringify({ ...pagination, slug: currentPerspective?.slug }),
    )
  }, [currentPerspective, pagination, setPagination])
}

const usePublicationsTableDataFetching = (
  columnFilters: MRT_ColumnFiltersState,
  globalFilter: string,
  sorting: MRT_SortingState,
  pagination: {
    pageIndex: number
    pageSize: number
  },
  selectedTab: string,
  triggerReloadList: boolean,
) => {
  const { currentPerspective } = useStore((state) => state.user)
  const lang = Lingui.i18n.locale as ExtendedLanguageCode

  const { fetchDocuments, countDocuments, latestDocumentRequestId } = useStore(
    (state) => state.document,
  )

  const requestIdRef = useRef(latestDocumentRequestId || 0)
  const countDocumentsRequestIdRef = useRef(0)

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
}

export const usePublicationsTable = (
  selectedTab: string,
  triggerReloadList: boolean,
  setOpenDialog: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  const { data: session } = useSession()
  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user.authz),
    [session?.user?.authz],
  )
  const { _ } = useLingui()
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const supportedLocales = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')

  const searchParams = useSearchParams()
  const navigateToDetailsPage = useCallback(
    (documentUid: string) => detailsPageUrl(documentUid, searchParams, lang),
    [searchParams, lang],
  )

  const {
    loading,
    documents = [],
    totalItems,
  } = useStore((state) => state.document)

  const [selectedTitleLangs, setSelectedTitleLangs] = useState<
    Record<string, string>
  >({})
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>(
    readInitialColumnFilters,
  )
  const [globalFilter, setGlobalFilter] = useState(readInitialGlobalFilter)

  const [sorting, setSorting] = useState<MRT_SortingState>(readInitialSorting)

  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])

  const initialPagination = useMemo(() => {
    const pagination = readInitialPagination()
    return { pageIndex: pagination.pageIndex, pageSize: pagination.pageSize }
  }, [])

  const [pagination, setPagination] = useState(initialPagination)

  usePublicationsTableStorage(
    globalFilter,
    sorting,
    columnFilters,
    pagination,
    setPagination,
  )

  usePublicationsTableDataFetching(
    columnFilters,
    globalFilter,
    sorting,
    pagination,
    selectedTab,
    triggerReloadList,
  )

  const typeOptions = useMemo(() => createDocTypeTree(_), [_])
  const columns = useMemo<
    MRT_ColumnDef<Document>[]
  >((): MRT_ColumnDef<Document>[] => {
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
        //@ts-expect-error:  override filterSelectOptions to accept Element.jsx instead of Element
        filterSelectOptions: typeOptions,
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
                component={NextLink}
                href={navigateToDetailsPage(row.original.uid)}
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
          const dateFormat = LocaleDateFormats[lang] || 'MM-DD-YYYY'
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
        muiTableHeadCellProps: {
          sx: { '& .MuiBox-root': { gridTemplateColumns: '1fr' } },
        },
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
                acronyms={[]}
                halSubmitType={HalSubmitType.file}
                halUrl={''}
                isSingleLine
              />
            ),
            value: 'in_collection',
          },
          {
            // @ts-expect-error: so that label accepts an Element
            label: (
              <HalStatusCellBadge
                type={HalStatusCellType.NotInSyncWithCollection}
                halSubmitType={HalSubmitType.file}
                acronyms={[]}
                halUrl={''}
                hasBeenUpdated={false}
                isOutOfCollection={false}
                isSingleLine
                documentUid={''}
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
                documentUid={''}
              />
            ),
            value: 'outside_hal',
          },
        ],
      },
      {
        enableSorting: false,
        accessorFn: (row) =>
          row.upwOAStatus
            ? row.upwOAStatus
            : row.oaStatus
              ? row.oaStatus
              : 'UNKNOWN',
        accessorKey: 'oaStatus',
        header: t`documents_page_oaStatus_column`,
        Cell({ row }) {
          return <OAStatusCell row={row} />
        },
        filterVariant: 'multi-select',
        filterSelectOptions: [
          //@ts-expect-error:  override filterSelectOptions to accept Element.jsx instead of Element
          ...Object.values(OAStatus).map((option) => {
            return {
              label: <OAStatusCellBadge type={option} />,
              value: option,
            }
          }),
          {
            // @ts-expect-error: so that label accepts an Element
            label: <OAStatusCellBadge type={'UNKNOWN'} />,
            value: 'UNKNOWN',
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
        //@ts-expect-error:  override filterSelectOptions to accept Element.jsx instead of Element
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
    _,
    typeOptions,
  ])
  const tableOptions: MRT_TableOptions<Document> = useMemo(
    () => ({
      columns,
      data: documents,
      enableRowActions: true,
      enableRowSelection: (row: MRT_Row<Document>) => {
        if (!isDocument(row.original)) return false
        const canMerge = ability.can(PermissionAction.merge, row.original)
        return canMerge && row.original.state == DocumentState.default
      },
      manualFiltering: true,
      manualPagination: true,
      manualSorting: true,
      muiTableBodyRowProps: ({
        row,
      }: {
        isDetailPanel?: boolean | undefined
        row: MRT_Row<Document>
        staticRowIndex: number
        table: MRT_TableInstance<Document>
      }) => {
        const isWaiting = row.original.state === 'waiting_for_update'
        return {
          className: isWaiting ? 'mrt-row-waiting' : '',
        }
      },
      onColumnFiltersChange: setColumnFilters,
      onGlobalFilterChange: setGlobalFilter,
      onPaginationChange: setPagination,
      onSortingChange: setSorting,
      positionActionsColumn: 'last',
      renderTopToolbarCustomActions: ({
        table,
      }: {
        table: MRT_TableInstance<Document>
      }) => (
        <Box sx={{ display: 'flex', gap: '1rem', p: '4px' }}>
          <Button
            color='secondary'
            disabled={table.getSelectedRowModel().rows.length < 2}
            onClick={() => {
              setSelectedDocuments(
                table.getSelectedRowModel().rows.map((row) => row.original.uid),
              )
              setOpenDialog(true)
            }}
            variant='contained'
          >
            {t`documents_page_merge_selected_documents_button`}
          </Button>
        </Box>
      ),
      renderRowActionMenuItems: ({
        row,
        table,
      }: {
        closeMenu: () => void
        row: MRT_Row<Document>
        staticRowIndex?: number | undefined
        table: MRT_TableInstance<Document>
      }) => {
        const isWaiting =
          row.original.state === DocumentState.waiting_for_update
        if (isWaiting) return []
        return [
          <Box sx={{ display: 'flex' }} key={row.original.uid}>
            <Link
              component={NextLink}
              href={navigateToDetailsPage(row.original.uid)}
              underline='none'
              color='inherit'
              sx={{ display: 'block', width: '100%' }}
            >
              <MRT_ActionMenuItem
                icon={<InfoIcon />}
                key='edit'
                label={t`documents_page_action_column_details`}
                table={table}
              />
            </Link>
          </Box>,
        ]
      },
      rowCount: totalItems,
      state: {
        columnFilters,
        globalFilter,
        isLoading: loading,
        pagination,
        sorting: sorting || DEFAULT_SORTING,
      },
    }),
    [
      columns,
      documents,
      totalItems,
      columnFilters,
      globalFilter,
      loading,
      pagination,
      sorting,
      ability,
      setOpenDialog,
      navigateToDetailsPage,
    ],
  )

  const table = useDocumentTable(tableOptions)
  return { table: table, selectedDocuments: selectedDocuments }
}
