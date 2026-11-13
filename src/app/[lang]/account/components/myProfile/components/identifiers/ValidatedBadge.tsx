'use client'

import { Box, Tooltip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { t } from '@lingui/core/macro'

// Marks a validated identifier (authentication implies validation)
const ValidatedBadge = () => (
  <Tooltip title={t`identifier_validated_tooltip`} arrow>
    <Box
      data-testid='identifier-validated-badge'
      sx={{ display: 'inline-flex', alignItems: 'center' }}
    >
      <CheckCircleIcon fontSize='small' color='success' />
    </Box>
  </Tooltip>
)

export default ValidatedBadge
