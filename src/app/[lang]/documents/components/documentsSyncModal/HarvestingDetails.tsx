import { Box, Typography } from '@mui/material'
import { FC } from 'react'
import { Trans } from '@lingui/macro'

interface Props {
  changes: {
    created: number
    updated: number
    deleted: number
    unchanged: number
  }
}

const HarvestingDetails: FC<Props> = ({ changes }) => {
  const total =
    (changes.created || 0) +
    (changes.updated || 0) +
    (changes.deleted || 0) +
    (changes.unchanged || 0)

  return (
    <Box
      sx={{
        position: 'relative',
        marginTop: 3,
        minWidth: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        padding: 1.5,
        borderRadius: 1,
        textAlign: 'left',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -10,
          left: 0,
          backgroundColor: 'primary.main',
          color: 'white',
          borderRadius: '999px',
          padding: '2px 8px',
          fontSize: '0.7rem',
          fontWeight: 600,
        }}
      >
        <Trans>documents_page_synchronize_modal_details_total</Trans> : {total}
      </Box>

      {/* Details */}
      <Typography variant='body2' sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
        <Trans>
          documents_page_synchronize_modal_synchronize_details_unchanged
        </Trans>
        : {changes.unchanged || 0}
      </Typography>
      <Typography
        variant='body2'
        sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'success.main' }}
      >
        <Trans>
          documents_page_synchronize_modal_synchronize_details_created
        </Trans>
        : {changes.created || 0}
      </Typography>
      <Typography
        variant='body2'
        sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'info.main' }}
      >
        <Trans>
          documents_page_synchronize_modal_synchronize_details_updated
        </Trans>
        : {changes.updated || 0}
      </Typography>
      <Typography
        variant='body2'
        sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'error.main' }}
      >
        <Trans>
          documents_page_synchronize_modal_synchronize_details_deleted
        </Trans>
        : {changes.deleted || 0}
      </Typography>
    </Box>
  )
}

export default HarvestingDetails
