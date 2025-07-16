import useStore from '@/stores/global_store'
import { LocaleDateFormats } from '@/types/LocaleDateFormats'
import { t, Trans } from '@lingui/macro'
import { Typography } from '@mui/material'
import dayjs from 'dayjs'

import RowLabel from './RowLabel'

const PublicationDate = () => {
  const { selectedDocument = null } = useStore((state) => state.document)

  return (
    <>
      <RowLabel>
        <Trans>document_details_page_date_row_label</Trans>
      </RowLabel>
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
