import { CustomCard } from '@/components/Card'
import useStore from '@/stores/global_store'
import { Trans } from '@lingui/react'
import {
  Box,
  Button,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
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
import RowLabel from './RowLabel'

type DocumentFieldKey =
  | 'titles'
  | 'type'
  | 'journal'
  | 'authors'
  | 'date'
  | 'abstracts'
  | 'sources'

interface DocumentField {
  value: DocumentFieldKey
  titleComponent: JSX.Element
  component: JSX.Element | null
}

const BibliographicInformation = () => {
  const { selectedDocument = null } = useStore((state) => state.document)
  const theme = useTheme()

  const documentFields: Record<DocumentFieldKey, DocumentField> = {
    titles: {
      value: 'titles',
      titleComponent: <Trans id='document_details_page_titles_row_label' />,
      component: selectedDocument?.titles ? <Titles /> : null,
    },
    type: {
      value: 'type',
      titleComponent: <Trans id='document_details_page_type_row_label' />,
      component: <Type />,
    },
    journal: {
      value: 'journal',
      titleComponent: <Trans id='document_details_page_journal_row_label' />,
      component: <Journal />,
    },
    authors: {
      value: 'authors',
      titleComponent: <Trans id='document_details_page_authors_row_label' />,
      component: <Authors />,
    },
    date: {
      value: 'date',
      titleComponent: (
        <Trans id='document_details_page_publication_date_row_label' />
      ),
      component: <PublicationDate />,
    },
    abstracts: {
      value: 'abstracts',
      titleComponent: <Trans id='document_details_page_abstracts_row_label' />,
      component: <Abstracts />,
    },
    sources: {
      value: 'sources',
      titleComponent: <Trans id='document_details_page_sources_row_label' />,
      component: <Sources />,
    },
  }

  const commonTypeFields: DocumentFieldKey[] = [
    'titles',
    'type',
    'date',
    'journal',
    'authors',
    'abstracts',
    'sources',
  ]

  const documentTypeFields: Record<DocumentType, DocumentFieldKey[]> = {
    [DocumentType.JournalArticle]: commonTypeFields,
    [DocumentType.Document]: commonTypeFields,
    [DocumentType.ScholarlyPublication]: commonTypeFields,
    [DocumentType.Book]: commonTypeFields,
    [DocumentType.Monograph]: commonTypeFields,
    [DocumentType.BookChapter]: commonTypeFields,
    [DocumentType.ConferenceArticle]: commonTypeFields,
    [DocumentType.Proceedings]: commonTypeFields,
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
          <Button variant='contained' color='primary'>
            <Trans id='document_details_page_card_validate_button' />
          </Button>
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
          <Table sx={{ minWidth: 650 }} aria-label='simple table'>
            <TableBody>
              {fieldsToDisplay.map((fieldKey) => {
                const field = documentFields[fieldKey]

                if (!field.component) {
                  return null
                }

                return (
                  <TableRow
                    key={fieldKey}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component='th' scope='row'>
                      <RowLabel>{field.titleComponent}</RowLabel>
                    </TableCell>
                    <TableCell>{field.component}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </CustomCard>
  )
}

export default BibliographicInformation
