import { Trans } from '@lingui/macro'
import SyncIcon from '@mui/icons-material/Sync'
import { Button, Typography } from '@mui/material'
import { Box } from '@mui/system'
import { FC } from 'react'

interface DocumentDetailsHeaderProps {}

const DocumentDetailsHeader: FC<DocumentDetailsHeaderProps> = ({}) => {
  return (
    <Box
      mb={3}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Typography variant='h4' gutterBottom>
        <Trans>documents_page_main_title</Trans>
      </Typography>
      <Button startIcon={<SyncIcon />} variant='outlined' />
    </Box>
  )
}

export default DocumentDetailsHeader
