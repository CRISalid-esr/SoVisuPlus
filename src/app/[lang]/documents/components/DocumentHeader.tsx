import { Trans } from '@lingui/macro'
import SyncIcon from '@mui/icons-material/Sync'
import { Button, Typography } from '@mui/material'
import { Box } from '@mui/system'
import { FC } from 'react'

interface DocumentHeaderProps {
  perspective: string
  onSyncClick: () => void
}

const DocumentHeader: FC<DocumentHeaderProps> = ({
  perspective,
  onSyncClick,
}) => {
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
        <Trans>documents_page_main_title</Trans> : {perspective}
      </Typography>
      <Button startIcon={<SyncIcon />} variant='outlined' onClick={onSyncClick}>
        <Trans>documents_page_synchronize_button</Trans>
      </Button>
    </Box>
  )
}

export default DocumentHeader
