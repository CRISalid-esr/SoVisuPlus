import { t } from '@lingui/core/macro'
import { CustomCard } from '@/components/Card'
import useStore from '@/stores/global_store'
import { Trans } from '@lingui/react'
import {
  Box,
  CardContent,
  Table,
  TableBody,
  TableContainer,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { DocumentType } from '@/types/Document'
import Authors from './Authors'
import PublicationDate from './PublicationDate'
import Sources from './Sources'
import Titles from './Titles'
import Type from './Type'
import Journal from './Journal'
import Abstracts from './Abstracts'
import Row from './Row'

export type DocumentFieldKey =
  | 'titles'
  | 'type'
  | 'journal'
  | 'authors'
  | 'date'
  | 'abstracts'
  | 'sources'

export type DocumentLocalizableFieldKey = 'titles' | 'abstracts'

export interface DocumentField {
  value: DocumentFieldKey
  title: string
  noContentAvailableMessage?: string
  component: React.ComponentType<{ content: string }> | null
  hasLanguageSelector?: boolean
}

const BibliographicInformation = () => {
  const { selectedDocument = null } = useStore((state) => state.document)
  const theme = useTheme()

  const documentFields: Record<DocumentFieldKey, DocumentField> = {
    titles: {
      value: 'titles',
      title: t`document_details_page_titles_row_label`,
      noContentAvailableMessage: t`document_details_page_no_title_available`,
      component: selectedDocument?.titles ? Titles : null,
      hasLanguageSelector: true,
    },
    type: {
      value: 'type',
      title: t`document_details_page_type_row_label`,
      component: Type,
    },
    journal: {
      value: 'journal',
      title: t`document_details_page_journal_row_label`,
      component: selectedDocument?.journal ? Journal : null,
    },
    authors: {
      value: 'authors',
      title: t`document_details_page_authors_row_label`,
      component: Authors,
    },
    date: {
      value: 'date',
      title: t`document_details_page_publication_date_row_label`,
      component: PublicationDate,
    },
    abstracts: {
      value: 'abstracts',
      title: t`document_details_page_abstracts_row_label`,
      noContentAvailableMessage: t`document_details_page_no_abstract_available`,
      component: selectedDocument?.abstracts ? Abstracts : null,
      hasLanguageSelector: true,
    },
    sources: {
      value: 'sources',
      title: t`document_details_page_sources_row_label`,
      component: Sources,
    },
  }

  const commonTypeFields: DocumentFieldKey[] = [
    'titles',
    'type',
    'date',
    'authors',
    'abstracts',
    'sources',
  ]

  const journalTypeFields: DocumentFieldKey[] = [...commonTypeFields, 'journal']

  const documentTypeFields: Record<DocumentType, DocumentFieldKey[]> = {
    [DocumentType.Article]: commonTypeFields,
    [DocumentType.JournalArticle]: journalTypeFields,
    [DocumentType.Document]: commonTypeFields,
    [DocumentType.ScholarlyPublication]: commonTypeFields,
    [DocumentType.Book]: commonTypeFields,
    [DocumentType.Monograph]: commonTypeFields,
    [DocumentType.BookChapter]: commonTypeFields,
    [DocumentType.ConferenceArticle]: commonTypeFields,
    [DocumentType.Proceedings]: commonTypeFields,
    [DocumentType.ConferenceAbstract]: commonTypeFields,
    [DocumentType.Preface]: commonTypeFields,
    [DocumentType.Comment]: commonTypeFields,
    [DocumentType.Presentation]: commonTypeFields,
    [DocumentType.BookOfChapters]: commonTypeFields,
  }

  const fieldsToDisplay: DocumentFieldKey[] =
    selectedDocument?.documentType &&
    documentTypeFields[selectedDocument.documentType]
      ? documentTypeFields[selectedDocument.documentType]
      : []

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
        </Box>
      }
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: theme.spacing(4),
        }}
      >
        <TableContainer>
          <Table sx={{ minWidth: 300 }}>
            <TableBody>
              {fieldsToDisplay.map((fieldKey) => {
                const field = documentFields[fieldKey]

                if (!field.component) {
                  return null
                }

                return <Row key={fieldKey} field={field}></Row>
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </CustomCard>
  )
}

export default BibliographicInformation
