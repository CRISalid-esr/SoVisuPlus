'use client'

import { TabFilter } from '@/components/TabFilter'
import useStore from '@/stores/global_store'
import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
} from '@/types/BibliographicPlatform'
import { Contribution } from '@/types/Contribution'
import { Document, DocumentType } from '@/types/Document'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { Literal } from '@/types/Literal'
import { getLocalizedValue } from '@/utils/getLocalizedValue'
import * as Lingui from '@lingui/core'
import { t, Trans } from '@lingui/macro'

import { LanguageChips } from '@/components/LanguageChips'
import { DocumentSync } from '@/types/DocumentSync'
import { DocumentSyncStatus } from '@/types/DocumentSyncStatus'
import { LocaleDateFormats } from '@/types/LocaleDateFormats'
import { Localization } from '@/types/Localization'
import InfoIcon from '@mui/icons-material/Info'
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material'
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
} from 'material-react-table'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation' // Import useRouter
import { useEffect, useMemo, useRef, useState } from 'react'
import Highlighter from 'react-highlight-words'
import DocumentHeader from './components/DocumentHeader'
import BibliographicSyncDataModal from './components/documentsSyncModal/DocumentSyncModal'
import { DocumentTypeIcons } from './components/DocumentTypeIcons'
import SyncIcon from '@mui/icons-material/Sync'
import HighlighterWithEllipsis from '@/app/[lang]/documents/components/HighlighterWithEllipsis'

dayjs.extend(utc)

export default function DocumentsPage() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<MRT_SortingState>([
    {
      id: 'date',
      desc: true,
    },
  ])

  const [openSynchronizeModal, setOpenSynchronizeModal] =
    useState<boolean>(false)
  const [documentSync, setDocumentSync] = useState<DocumentSync[]>(
    Object.values(BibliographicPlatform).map((platform) => ({
      name: platform,
      status: DocumentSyncStatus.success,
      selected: false,
      changes: {
        added: 0,
        updated: 0,
        deleted: 0,
      },
    })),
  )

  const { currentPerspective } = useStore((state) => state.user)
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const supportedLocales = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')

  const [selectedTitleLangs, setSelectedTitleLangs] = useState<
    Record<string, string>
  >({})

  const theme = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()

  const navigateToDetailsPage = (documentUid: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'bibliographic_information')
    router.push(`/${lang}/documents/${documentUid}?${params.toString()}`)
  }

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

  const documentTypeLabels: Record<DocumentType, JSX.Element> = {
    [DocumentType.Document]: (
      <Typography>{t`documents_page_document_icon_label`}</Typography>
    ),
    [DocumentType.ScholarlyPublication]: (
      <Typography>{t`documents_page_scholarly_publication_icon_label`}</Typography>
    ),
    [DocumentType.JournalArticle]: (
      <Typography>{t`documents_page_journal_article_icon_label`}</Typography>
    ),
    [DocumentType.Book]: (
      <Typography>{t`documents_page_book_icon_label`}</Typography>
    ),
    [DocumentType.Monograph]: (
      <Typography>{t`documents_page_monograph_icon_label`}</Typography>
    ),
    [DocumentType.BookChapter]: (
      <Typography>{t`documents_page_book_chapter_icon_label`}</Typography>
    ),
    [DocumentType.ConferenceArticle]: (
      <Typography>{t`documents_page_conference_article_icon_label`}</Typography>
    ),
    [DocumentType.Proceedings]: (
      <Typography>{t`documents_page_proceedings_icon_label`}</Typography>
    ),
  }

  const [selectedTab, setSelectedTab] = useState(tabs[0].value)

  const columns = useMemo<MRT_ColumnDef<Document>[]>(
    () => [
      {
        enableSorting: false,
        accessorKey: 'type',
        header: t`documents_page_type_column`,
        Cell({ row }: { row: { original: { documentType: DocumentType } } }) {
          return (
            <Tooltip title={documentTypeLabels[row.original.documentType]}>
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
              {documentTypeLabels[type]}
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
          row: { original: { titles: Array<Literal>; uid: string } }
          column: MRT_Column<Document>
        }) {
          const { titles, uid } = row.original
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
                  const documentUid = row.original.uid
                  navigateToDetailsPage(documentUid)
                }}
                sx={{
                  cursor: 'pointer',
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
                  setSelectedTitleLangs((prev) => ({ ...prev, [uid]: newLang }))
                }
              />
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
                name = person.getDisplayName()
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
              {orderedPlatforms.reduce<JSX.Element[]>((acc, platform) => {
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
    ],
    [lang, globalFilter, selectedTitleLangs, currentPerspective],
  )

  const requestIdRef = useRef(0)

  const {
    fetchDocuments,
    loading,
    documents = [],
    totalItems,
  } = useStore((state) => state.document)
  useEffect(() => {
    const adjustedFilters = columnFilters.map((filter) => {
      if (filter.id === 'date' && Array.isArray(filter.value)) {
        const [startDate, endDate] = filter.value

        // Function to safely convert startDate to 00:00:00 and endDate to 23:59:59.999
        const toUTCISOString = (dateStr: string | null, isEndDate = false) => {
          if (!dateStr) return null // Return null if no date

          const parsedDate = dayjs(dateStr)
          if (!parsedDate.isValid()) return null // Return null if invalid date

          // If it's an end date, set it to 23:59:59.999, otherwise 00:00:00
          const utcDate = isEndDate
            ? new Date(
                Date.UTC(
                  parsedDate.year(),
                  parsedDate.month(),
                  parsedDate.date(),
                  23,
                  59,
                  59,
                  999,
                ),
              ) // Last second of the day
            : new Date(
                Date.UTC(
                  parsedDate.year(),
                  parsedDate.month(),
                  parsedDate.date(),
                  0,
                  0,
                  0,
                  0,
                ),
              ) // Start of the day

          return utcDate.toISOString()
        }

        return {
          ...filter,
          value: [toUTCISOString(startDate), toUTCISOString(endDate, true)], // Pass true for end date
        }
      }
      return filter
    })

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
      <DocumentHeader
        perspective={
          currentPerspective?.getDisplayName(lang as ExtendedLanguageCode) || ''
        }
        pageName={t`documents_page_main_title`}
      >
        <Button
          startIcon={<SyncIcon />}
          variant='outlined'
          onClick={() => setOpenSynchronizeModal(true)}
        >
          <Trans>documents_page_synchronize_button</Trans>
        </Button>
      </DocumentHeader>
      <TabFilter
        tabsData={tabs}
        selectedValue={selectedTab}
        onTabChange={handleTabChange}
      />

      <BibliographicSyncDataModal
        openSynchronizeModal={openSynchronizeModal}
        setOpenSynchronizeModal={setOpenSynchronizeModal}
        documentSync={documentSync}
        setDocumentSync={setDocumentSync}
      />

      <MaterialReactTable
        initialState={{ showColumnFilters: true }}
        manualFiltering
        manualPagination
        manualSorting
        enableColumnResizing
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
        localization={Localization[lang]}
        enableRowActions
        positionActionsColumn='last'
        renderRowActionMenuItems={({ row, table }) => [
          <Box sx={{ display: 'flex' }} key={row.original.uid}>
            <MRT_ActionMenuItem
              icon={<InfoIcon />}
              key='edit'
              label={t`documents_page_action_column_details`}
              onClick={() => {
                const documentUid = row.original.uid
                navigateToDetailsPage(documentUid)
              }}
              table={table}
            />
          </Box>,
        ]}
      />
    </Box>
  )
}
