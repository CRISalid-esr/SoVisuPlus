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
import ArticleIcon from '@mui/icons-material/Article'
import BookIcon from '@mui/icons-material/Book'
import DescriptionIcon from '@mui/icons-material/Description'
import SchoolIcon from '@mui/icons-material/School'
import SyncIcon from '@mui/icons-material/Sync'
import {
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import {
  MaterialReactTable,
  MRT_Column,
  MRT_ColumnDef,
  MRT_ColumnFiltersState,
  MRT_Localization,
  MRT_SortingState,
} from 'material-react-table'
import { MRT_Localization_EN } from 'material-react-table/locales/en'
import { MRT_Localization_FR } from 'material-react-table/locales/fr'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import Highlighter from 'react-highlight-words'
import { Modal } from '@/components/Modal'
import CircularProgress from '@mui/material/CircularProgress'
import { useTheme } from '@mui/material/styles'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import { BibliographicSyncDataStatus } from '@/types/BibliographicSyncDataStatus'
dayjs.extend(utc)

const localeFormats: Record<string, string> = {
  fr: 'DD-MM-YYYY',
  en: 'MM-DD-YYYY',
  de: 'DD.MM.YYYY',
  es: 'DD/MM/YYYY',
}

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
  const [sorting, setSorting] = useState<MRT_SortingState>([
    {
      id: 'date',
      desc: true,
    },
  ])

  const [openSynchronizeModal, setOpenSynchronizeModal] = useState(false)
  const [bibliographicSyncData, setBibliographicSyncData] = useState(
    Object.values(BibliographicPlatform).map((platform) => ({
      platform,
      status: BibliographicSyncDataStatus.success,
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

  const documentTypeIcons: Record<DocumentType, JSX.Element> = {
    [DocumentType.Document]: <DescriptionIcon />,
    [DocumentType.ScholarlyPublication]: <SchoolIcon />,
    [DocumentType.JournalArticle]: <ArticleIcon />,
    [DocumentType.Book]: <BookIcon />,
    [DocumentType.Monograph]: <BookIcon />, //TDOO: change icon later
    [DocumentType.BookChapter]: <BookIcon />,
    [DocumentType.ConferenceArticle]: (
      <span className='material-symbols-outlined'>podium</span>
    ),
    [DocumentType.Proceedings]: (
      <span className='material-symbols-outlined'>podium</span>
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
              {documentTypeIcons[row.original.documentType]}
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
                {documentTypeIcons[type]}
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
          const effectiveRowLang = localizedTitle.language
          const filterValue = column.getFilterValue()
          const chips = titles.map((title, index) => {
            // skip ul : undetermined language
            if (title.language === 'ul') {
              return null
            }
            return (
              <Chip
                key={index}
                size='small'
                sx={{
                  marginRight: theme.spacing(1),
                }}
                clickable={title.language !== effectiveRowLang}
                label={title.language}
                onClick={(e) => {
                  if (title.language === effectiveRowLang) {
                    e.preventDefault()
                    return
                  }
                  setSelectedTitleLangs({
                    ...selectedTitleLangs,
                    [uid]: title.language,
                  })
                }}
                color={
                  title.language === effectiveRowLang ? 'primary' : 'default'
                }
              />
            )
          })
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Highlighter
                highlightClassName='highlight'
                searchWords={[globalFilter, filterValue as string]}
                autoEscape
                textToHighlight={localizedTitle.value}
              />
              <Box>{chips}</Box>
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
        size: 100,
        accessorKey: 'date',
        header: t`documents_page_publication_date_column`,
        Cell({ row }: { row: { original: Document } }) {
          const dateStr = row.original?.publicationDate
          if (!dateStr) {
            return t`documents_page_publication_date_column_no_date_available`
          }
          const dateFormat = localeFormats[lang] || 'MM-DD-YYYY'
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
    [lang, globalFilter, selectedTitleLangs],
  )

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

    fetchDocuments({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      searchTerm: globalFilter,
      searchLang: lang,
      columnFilters: JSON.stringify(adjustedFilters), // Use adjusted date filter
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

  function SuccessSynchronization({
    platform,
  }: {
    platform: { changes: { added: number; updated: number; deleted: number } }
  }) {
    const [hovered, setHovered] = useState(false)

    return (
      <Tooltip title={renderBibliographicPlatformChanges(platform)} arrow>
        <Box
          sx={{
            position: 'relative',
            display: 'inline-block',
            width: 40,
            height: 40,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Success Image */}
          <Image
            src='/icons/success.svg'
            alt='language'
            width={40}
            height={40}
            priority
          />

          {/* Plus Icon (Only Visible on Hover) */}
          {hovered && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.3)', // Optional: Dark overlay
                borderRadius: '50%',
              }}
            >
              <AddOutlinedIcon sx={{ color: 'white', fontSize: 24 }} />
            </Box>
          )}
        </Box>
      </Tooltip>
    )
  }

  const renderBibliographicPlatformChanges = (platform: {
    changes: { added: number; updated: number; deleted: number }
  }) => {
    return (
      <List>
        <ListItem
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'no-wrap',
          }}
        >
          <ListItemIcon>
            <FiberManualRecordIcon sx={{ fontSize: theme.utils.pxToRem(8) }} />
          </ListItemIcon>
          <ListItemText>
            {platform.changes.added}{' '}
            <Trans>
              documents_page_synchronize_modal_synchronize_success_tooltip_added_message
            </Trans>
          </ListItemText>
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <FiberManualRecordIcon sx={{ fontSize: theme.utils.pxToRem(8) }} />
          </ListItemIcon>
          <ListItemText>
            {platform.changes.updated}{' '}
            <Trans>
              documents_page_synchronize_modal_synchronize_success_tooltip_updated_message
            </Trans>
          </ListItemText>
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <FiberManualRecordIcon sx={{ fontSize: theme.utils.pxToRem(8) }} />
          </ListItemIcon>
          <ListItemText>
            {platform.changes.deleted}{' '}
            <Trans>
              documents_page_synchronize_modal_synchronize_success_tooltip_deleted_message
            </Trans>
          </ListItemText>
        </ListItem>
      </List>
    )
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
            <Trans>documents_page_main_title</Trans> :{' '}
            {currentPerspective?.getDisplayName(lang as ExtendedLanguageCode)}
          </Typography>
        </Box>
        <Button
          startIcon={<SyncIcon />}
          variant='outlined'
          onClick={() => setOpenSynchronizeModal(true)}
        >
          <Trans>documents_page_synchronize_button</Trans>
        </Button>
      </Box>
      <TabFilter
        tabsData={tabs}
        selectedValue={selectedTab}
        onTabChange={handleTabChange}
      />
      <Modal
        open={openSynchronizeModal}
        onClose={() => setOpenSynchronizeModal(false)}
        header={
          <Box
            sx={{
              marginTop: theme.spacing(2),
              marginLeft: theme.utils.pxToRem(20),
            }}
          >
            <Typography
              variant='h6'
              gutterBottom
              sx={{
                lineHeight: theme.typography.lineHeight.lineHeight28px,
                fontStyle: 'normal',
                fontSize: theme.utils.pxToRem(28),
                fontWeight: theme.typography.fontWeightBold,
              }}
            >
              <Trans>documents_page_synchronize_modal_title</Trans> :
            </Typography>
          </Box>
        }
        actions={
          <>
            <Button
              variant='outlined'
              onClick={() => setOpenSynchronizeModal(false)}
              sx={{
                marginRight: 1,
                fontStyle: 'normal',
                fontSize: theme.utils.pxToRem(14),
                letterSpacing: '0.1px',
                lineHeight: theme.typography.lineHeight.lineHeight20px,
                fontWeight: theme.typography['500'],
              }}
            >
              <Trans>documents_page_synchronize_modal_cancel_button</Trans>
            </Button>
            <Button
              sx={{
                fontStyle: 'normal',
                fontSize: theme.utils.pxToRem(14),
                letterSpacing: '0.1px',
                lineHeight: theme.typography.lineHeight.lineHeight20px,
                fontWeight: theme.typography['500'],
              }}
              variant='contained'
            >
              <Trans>documents_page_synchronize_modal_synchronize_button</Trans>
            </Button>
          </>
        }
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {synchronizeBibliographicPlatform.map((platform) => {
            return (
              <Box
                key={platform.platform}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexDirection: 'column',
                }}
              >
                <Button
                  variant='outlined'
                  size='small'
                  sx={{
                    marginRight: 1,
                    marginBottom: 2,
                    fontSize: theme.utils.pxToRem(16),
                    backgroundColor: platform.selected
                      ? theme.palette.primary.main
                      : theme.palette.white,
                    color: platform.selected
                      ? theme.palette.white
                      : theme.palette.primary.main,
                    fontWeight: theme.typography['500'],
                    lineHeight: theme.typography.lineHeight.lineHeight16px,
                    letterSpacing: '0.5px',
                    '&:hover': {
                      backgroundColor: platform.selected
                        ? theme.palette.primary.main
                        : theme.palette.white,
                      color: platform.selected
                        ? theme.palette.white
                        : theme.palette.primary.main,
                    },
                  }}
                  onClick={() => {
                    setSynchronizeBibliographicPlatform(
                      synchronizeBibliographicPlatform.map((item) => {
                        if (item.platform === platform.platform) {
                          return {
                            ...item,
                            selected: !item.selected,
                          }
                        }
                        return item
                      }),
                    )
                  }}
                >
                  {platform.platform}
                </Button>
                {platform.status ===
                  synchronizeBibliographicPlatformStatus.loading && (
                  <CircularProgress
                    sx={{
                      width: 40,
                      height: 40,
                    }}
                  />
                )}
                {platform.status ===
                  synchronizeBibliographicPlatformStatus.success && (
                  <SuccessSynchronization platform={platform} />
                )}
                {platform.status ===
                  synchronizeBibliographicPlatformStatus.error && (
                  <Image
                    src='/icons/error.svg'
                    alt='language'
                    width={40}
                    height={40}
                    priority
                  />
                )}
              </Box>
            )
          })}
        </Box>
      </Modal>
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
        localization={localization[lang]}
      />
    </Box>
  )
}
