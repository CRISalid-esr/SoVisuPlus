import { t } from '@lingui/core/macro'
import useStore from '@/stores/global_store'
import { LocaleDateFormats } from '@/types/LocaleDateFormats'
import { Typography } from '@mui/material'
import dayjs from 'dayjs'

const PublicationDate = () => {
  const { selectedDocument = null } = useStore((state) => state.document)

  return (
    <Typography>
      {!selectedDocument?.publicationDate
        ? t`documents_page_publication_date_column_no_date_available`
        : !dayjs(selectedDocument.publicationDate, 'YYYY-MM-DD').isValid()
          ? selectedDocument.publicationDate
          : dayjs(selectedDocument.publicationDate, 'YYYY-MM-DD').format(
              LocaleDateFormats['lang'] || 'MM-DD-YYYY',
            )}
    </Typography>
  )
}

export default PublicationDate
