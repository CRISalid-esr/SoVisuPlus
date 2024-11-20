'use client';

import { Trans } from '@lingui/macro';
import { Box, Typography } from '@mui/material';

export default function Login() {
  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom>
        <Trans>Login Page work</Trans>
      </Typography>
    </Box>
  );
}
