import useStore from '@/stores/global_store'
import { Trans } from '@lingui/macro'
import { Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { DocumentTypeLabels } from '../../../components/DocumentTypeLabels'

const Type = () => {
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
        <Trans>document_details_page_type_row_label</Trans>
      </Typography>
      {selectedDocument && DocumentTypeLabels[selectedDocument.documentType]}
    </>
  )
}

export default Type
