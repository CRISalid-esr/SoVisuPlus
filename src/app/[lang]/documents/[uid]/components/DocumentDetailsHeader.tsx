import { Trans } from '@lingui/macro'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { IconButton, Typography } from '@mui/material'
import { Box } from '@mui/system'
import { useRouter } from 'next/navigation' // Import useRouter

const DocumentDetailsHeader = () => {
  const router = useRouter()

  return (
    <Box
      mb={3}
      onClick={() => router.back()}
      sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        cursor: 'pointer',
      }}
    >
      <IconButton>
        <ArrowBackIcon />
      </IconButton>
      <Typography>
        <Trans>document_details_page_main_title</Trans>
      </Typography>
    </Box>
  )
}

export default DocumentDetailsHeader
