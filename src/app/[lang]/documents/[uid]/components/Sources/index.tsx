import { CustomCard } from '@/components/Card'
import useStore from '@/stores/global_store'
import { DocumentType } from '@/types/Document'
import { DocumentRecord } from '@/types/DocumentRecord'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { Localization } from '@/types/Localization'
import * as Lingui from '@lingui/core'
import { t } from '@lingui/macro'
import { Trans } from '@lingui/react'
import { Box, Button, CardContent, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  MaterialReactTable,
  MRT_Column,
  MRT_ColumnDef,
} from 'material-react-table'
import { useMemo, useState } from 'react'
import { DocumentTypeIcons } from '../../../components/DocumentTypeIcons'
import { Literal } from '@/types/Literal'
import { getLocalizedValue } from '@/utils/getLocalizedValue'
import Highlighter from 'react-highlight-words'
import { LanguageChips } from '@/components/LanguageChips'

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
  const [globalFilter, setGlobalFilter] = useState<String>('')

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

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Highlighter
                highlightClassName='highlight'
                searchWords={[globalFilter, column.getFilterValue() as string]}
                autoEscape
                textToHighlight={localizedTitle.value}
              />
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
        filterVariant: 'multi-select',
      },
    ],
    [],
  )

  console.log('selectedDocument', selectedDocument)

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
            <Trans id='document_details_page_card_title' />
          </Typography>
          <Button variant='contained' color='primary'>
            <Trans id='document_details_page_card_validate_button' />
          </Button>
        </Box>
      }
    >
      <CardContent>
        <MaterialReactTable
          initialState={{ showColumnFilters: true }}
          enableColumnResizing
          columns={columns}
          rowCount={selectedDocument?.records.length || 0}
          data={selectedDocument?.records || []}
          enablePagination
          localization={Localization[lang]}
        />
      </CardContent>
    </CustomCard>
  )
}

export default Sources
