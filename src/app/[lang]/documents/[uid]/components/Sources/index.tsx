import { CustomCard } from '@/components/Card'
import { LanguageChips } from '@/components/LanguageChips'
import useStore from '@/stores/global_store'
import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
} from '@/types/BibliographicPlatform'
import { DocumentType } from '@/types/Document'
import { DocumentRecord } from '@/types/DocumentRecord'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { getLocalizedValue } from '@/utils/getLocalizedValue'
import * as Lingui from '@lingui/core'
import { t } from '@lingui/macro'
import { Trans } from '@lingui/react'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Box,
  Button,
  CardContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  MaterialReactTable,
  MRT_ColumnDef,
  MRT_GlobalFilterTextField,
  MRT_Row,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFullScreenButton,
  useMaterialReactTable,
} from 'material-react-table'
import Image from 'next/image'
import { ReactNode, useMemo, useState } from 'react'
import { DocumentTypeIcons } from '../../../components/DocumentTypeIcons'

import CallMergeIcon from '@mui/icons-material/CallMerge'
import { Localization } from '@/types/Localization'

function Sources() {
  const { selectedDocument = null } = useStore((state) => state.document)
  const theme = useTheme()
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const supportedLocales = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')
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
  const [selectedTitleLangs, setSelectedTitleLangs] = useState<
    Record<string, string>
  >({})
  const [action, setAction] = useState<string>('')

  const columns = useMemo<MRT_ColumnDef<DocumentRecord>[]>(
    () => [
      {
        enableSorting: false,
        accessorKey: 'type',
        header: t`documents_page_type_column`,
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
          const { titles, uid } = row
          const preferredRowLang = selectedTitleLangs[uid] || lang
          const localizedTitle = getLocalizedValue(
            titles,
            preferredRowLang,
            supportedLocales,
            t`no_title_available`,
          )
          return localizedTitle.value
        },
        enableFilterMatchHighlighting: true,
        header: t`documents_page_title_column`,
        Cell({
          row,
          renderedCellValue,
        }: {
          row: MRT_Row<DocumentRecord>
          renderedCellValue: ReactNode
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
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography>{renderedCellValue}</Typography>
              <LanguageChips
                texts={titles}
                selectedLang={effectiveRowLang}
                onLanguageSelect={(newLang) =>
                  setSelectedTitleLangs((prev) => ({ ...prev, [uid]: newLang }))
                }
              />
            </Box>
          )
        },
      },
      {
        accessorKey: 'contributions',
        header: t`documents_page_contributors_column`,
      },
      {
        size: 100,
        accessorKey: 'date',
        header: t`documents_page_publication_date_column`,
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
        enableSorting: false,
        accessorKey: 'source',
        header: t`documents_page_source_column`,
        Cell({ row }: { row: { original: DocumentRecord } }) {
          const platform = row.original.platform
          const metadata = BibliographicPlatformMetadata[platform]
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
          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {row.original.url ? (
                <IconButton
                  key={row.original.platform}
                  component='a'
                  href={row.original.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  sx={{ padding: 0 }}
                >
                  {imageElement}
                </IconButton>
              ) : (
                <Box key={row.original.platform}>{imageElement}</Box>
              )}
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
        filterFn: (row, filterValues) => {
          if (!filterValues || filterValues.length === 0) return true
          return filterValues.includes(row.original.platform)
        },
      },
    ],
    [],
  )

  const handleChange = () => {
    setAction('')
  }

  const table = useMaterialReactTable({
    columns,
    data: selectedDocument?.records || [],
    enableRowSelection: true,
    localization:Localization[lang],
    positionToolbarAlertBanner: 'bottom', //show selected rows count on bottom toolbar
    renderTopToolbarCustomActions: () => (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <FormControl
          sx={{
            minWidth: 120,
            width: '100%',
          }}
        >
          <InputLabel id='demo-simple-select-autowidth-label'>
            {' '}
            <Trans id='document_details_page_source_tab_select_action_label' />
          </InputLabel>
          <Select
            labelId='demo-simple-select-autowidth-label'
            id='demo-simple-select-autowidth'
            value={action}
            onChange={handleChange}
            autoWidth
            label={
              <Trans id='document_details_page_source_tab_select_action_label' />
            }
          >
            <MenuItem value='pending'>
              <Box display='flex' alignItems='center'>
                <DeleteIcon />
                <Trans id='document_details_page_source_tab_select_action_delete_label' />
              </Box>{' '}
            </MenuItem>

            <MenuItem value='rejected'>
              <Box display='flex' alignItems='center'>
                <CallMergeIcon />
                <Trans id='document_details_page_source_tab_select_action_merge_label' />
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
      </Box>
    ),
    renderToolbarInternalActions: ({ table }) => (
      <Box>
        <MRT_ToggleDensePaddingButton table={table} />
        <MRT_ToggleFullScreenButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_GlobalFilterTextField table={table} />
      </Box>
    ),
  })

  return (
    <CustomCard
      header={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            sx={{
              color: theme.palette.primary.main,
              fontSize: theme.utils.pxToRem(20),
              fontStyle: 'normal',
              fontWeight: theme.typography.fontWeightRegular,
              lineHeight: 'normal',
            }}
          >
            <Trans id='document_details_page_source_tab_card_title' />
          </Typography>
          <Button variant='contained' color='primary'>
            <Trans id='document_details_page_source_tab_card_validate_button' />
          </Button>
        </Box>
      }
    >
      <CardContent>
        <MaterialReactTable table={table} />;
      </CardContent>
    </CustomCard>
  )
}

export default Sources
