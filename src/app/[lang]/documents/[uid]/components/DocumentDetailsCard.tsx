import { CustomCard } from '@/components/Card'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import * as Lingui from '@lingui/core'
import { Trans } from '@lingui/react'
import { CardContent, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { FC } from 'react'
import DocumentDetailsCardTitles from './DocumentDetailsCardTitles'
import { Box } from '@mui/system'
interface DocumentDetailsCardProps {}
const DocumentDetailsCard: FC<DocumentDetailsCardProps> = ({}) => {
  const { selectedDocument = null } = useStore((state) => state.document)
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const theme = useTheme()

  const documentFields: Record<
    string,
    { value: string; component: JSX.Element | null }
  > = {
    titles: {
      value: 'titles',
      component: selectedDocument?.titles ? (
        <DocumentDetailsCardTitles />
      ) : null,
    },
  }

  const documentTypeFields: Record<string, string[]> = {
    Book: ['titles'],
    JournalArticle: ['titles'],
  }

  const fieldsToDisplay =
    documentTypeFields[selectedDocument?.documentType ?? ''] || []

  return (
    <CustomCard
      header={
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
        <Box component='ul' sx={{ paddingLeft: theme.spacing(2) }}>
          {fieldsToDisplay.map((fieldKey) => {
            const field = documentFields[fieldKey]
            return field?.component ? field?.component : null
          })}
        </Box>
      </CardContent>
    </CustomCard>
  )
}

export default DocumentDetailsCard
