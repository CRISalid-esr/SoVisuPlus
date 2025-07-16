import useStore from '@/stores/global_store'
import { Trans } from '@lingui/macro'
import { Typography } from '@mui/material'

import RowLabel from './RowLabel'

export default function Journal() {
  const { selectedDocument = null } = useStore((state) => state.document)
  const title = selectedDocument?.journal?.titles[0]

  console.log(title)
  return (
    <>
      <RowLabel>
        <Trans>document_details_page_journal_row_label</Trans>
      </RowLabel>
      {title && <Typography>{title}</Typography>}
    </>
  )
}
