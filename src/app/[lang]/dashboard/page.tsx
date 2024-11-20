'use client';

import { Trans } from '@lingui/macro';
import { Box, Typography } from '@mui/material';

export default function DashboardPage() {
  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom>
        <Trans>Dhashboard work!</Trans>
      </Typography>
    </Box>
  );
}
