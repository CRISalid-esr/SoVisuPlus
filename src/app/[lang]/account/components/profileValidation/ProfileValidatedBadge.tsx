'use client'

import { Box, Tooltip } from '@mui/material'
import VerifiedIcon from '@mui/icons-material/Verified'
import { t } from '@lingui/core/macro'

// Marks a profile reviewed by a wide-scoped account editor
const ProfileValidatedBadge = ({
  fontSize = 'medium',
}: {
  fontSize?: 'small' | 'medium' | 'large'
}) => (
  <Tooltip title={t`profile_validated_tooltip`} arrow>
    <Box
      data-testid='profile-validated-badge'
      // lineHeight 0 keeps the box at the icon's height so flex centering is exact
      sx={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}
    >
      <VerifiedIcon fontSize={fontSize} color='success' />
    </Box>
  </Tooltip>
)

export default ProfileValidatedBadge
