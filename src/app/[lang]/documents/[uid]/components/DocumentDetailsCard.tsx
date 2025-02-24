import { CustomCard } from '@/components/Card'
import useStore from '@/stores/global_store'
import { Trans } from '@lingui/react'
import {
  Box,
  Button,
  CardContent,
  List,
  ListItem,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { DocumentType } from '@/types/Document'
import DocumentDetailsCardAuthors from './DocumentDetailsCardAuthors'
import DocumentDetailsCardDate from './DocumentDetailsCardDate'
import DocumentDetailsCardSources from './DocumentDetailsCardSources'
import DocumentDetailsCardTitles from './DocumentDetailsCardTitles'

type DocumentFieldKey = 'titles' | 'authors' | 'date' | 'sources'

interface DocumentField {
  value: DocumentFieldKey
  component: JSX.Element | null
}

const DocumentDetailsCard = () => {
  const { selectedDocument = null } = useStore((state) => state.document)
  const theme = useTheme()

  const documentFields: Record<DocumentFieldKey, DocumentField> = {
    titles: {
      value: 'titles',
      component: selectedDocument?.titles ? (
        <DocumentDetailsCardTitles />
      ) : null,
    },
    authors: {
      value: 'authors',
      component: <DocumentDetailsCardAuthors />,
    },
    date: {
      value: 'date',
      component: <DocumentDetailsCardDate />,
    },
    sources: {
      value: 'sources',
      component: <DocumentDetailsCardSources />,
    },
  }
  const documentTypeFields: Record<DocumentType, DocumentFieldKey[]> = {
    [DocumentType.JournalArticle]: ['titles', 'authors', 'date', 'sources'],
    [DocumentType.Document]: ['titles', 'authors', 'date', 'sources'],
    [DocumentType.ScholarlyPublication]: [
      'titles',
      'authors',
      'date',
      'sources',
    ],
    [DocumentType.Book]: ['titles', 'authors', 'date', 'sources'],
    [DocumentType.Monograph]: ['titles', 'authors', 'date', 'sources'],
    [DocumentType.BookChapter]: ['titles', 'authors', 'date', 'sources'],
    [DocumentType.ConferenceArticle]: ['titles', 'authors', 'date', 'sources'],
    [DocumentType.Proceedings]: ['titles', 'authors', 'date', 'sources'],
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
        <List
          sx={{
            paddingLeft: theme.spacing(2),
            width: '100%',
          }}
        >
          {fieldsToDisplay.map((fieldKey) => {
            const field = documentFields[fieldKey]
            return field?.component ? (
              <ListItem
                key={fieldKey}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing(2),
                  borderBottom: `1px solid ${theme.palette.grey[300]}`,
                }}
              >
                {field.component}
              </ListItem>
            ) : null
          })}
        </List>
      </CardContent>
    </CustomCard>
  )
}

export default DocumentDetailsCard
