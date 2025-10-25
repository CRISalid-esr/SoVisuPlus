'use client'

import { Trans } from '@lingui/react/macro'
import { Box, Typography } from '@mui/material'

export default function LaboratoriesPage() {
  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant='h4' gutterBottom>
        <Trans>side_bar_laboratories</Trans>
      </Typography>
    </Box>
  )
}
