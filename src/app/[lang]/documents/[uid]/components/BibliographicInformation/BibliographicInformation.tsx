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
import Authors from './Authors'
import PublicationDate from './PublicationDate'
import Sources from './Sources'
import Titles from './Titles'
import Type from './Type'
import Journal from './Journal'
import Abstracts from './Abstracts'

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
  component: JSX.Element | null
}

const BibliographicInformation = () => {
  const { selectedDocument = null } = useStore((state) => state.document)
  const theme = useTheme()

  const documentFields: Record<DocumentFieldKey, DocumentField> = {
    titles: {
      value: 'titles',
      component: selectedDocument?.titles ? <Titles /> : null,
    },
    type: {
      value: 'type',
      component: <Type />,
    },
    journal: {
      value: 'journal',
      component: <Journal />,
    },
    authors: {
      value: 'authors',
      component: <Authors />,
    },
    date: {
      value: 'date',
      component: <PublicationDate />,
    },
    abstracts: {
      value: 'abstracts',
      component: <Abstracts />,
    },
    sources: {
      value: 'sources',
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

export default BibliographicInformation
