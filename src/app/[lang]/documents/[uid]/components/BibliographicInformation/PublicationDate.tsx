import useStore from '@/stores/global_store'
import { LocaleDateFormats } from '@/types/LocaleDateFormats'
import { t, Trans } from '@lingui/macro'
import { Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import dayjs from 'dayjs'

const PublicationDate = () => {
  const theme = useTheme()
  const { selectedDocument = null } = useStore((state) => state.document)

  return (
    <>
      <Typography
        sx={{
          color: theme.palette.primary.main,
          fontSize: theme.utils.pxToRem(14),
          fontStyle: 'normal',
          fontWeight: theme.typography[500],
          lineHeight: 'normal',
          letterSpacing: '0.1px',
        }}
      >
        <Trans>document_details_page_date_row_label</Trans>
      </Typography>
      <Typography>
        {!selectedDocument?.publicationDate
          ? t`documents_page_publication_date_column_no_date_available`
          : !dayjs(selectedDocument.publicationDate, 'YYYY-MM-DD').isValid()
            ? selectedDocument.publicationDate
            : dayjs(selectedDocument.publicationDate, 'YYYY-MM-DD').format(
                LocaleDateFormats['lang'] || 'MM-DD-YYYY',
              )}
      </Typography>
    </>
  )
}

export default PublicationDate
