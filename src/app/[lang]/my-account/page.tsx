'use client';

import { Trans } from '@lingui/macro';
import { Box, Typography } from '@mui/material';

export default function MyAccountPage() {
  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom>
        <Trans>side_bar_my_account</Trans>
      </Typography>
    </Box>
  );
}
