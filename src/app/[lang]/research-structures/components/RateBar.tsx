'use client'

import { Box, LinearProgress, Typography } from '@mui/material'

/**
 * Small percentage bar shared by the structures tables and the tree detail
 * panel.
 */
const RateBar = ({ value, color }: { value: number; color: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Box sx={{ width: 54 }}>
      <LinearProgress
        variant='determinate'
        value={value}
        sx={{
          height: 6,
          borderRadius: 3,
          backgroundColor: 'action.disabledBackground',
          '& .MuiLinearProgress-bar': { backgroundColor: color },
        }}
      />
    </Box>
    <Typography variant='caption' fontWeight='bold'>
      {value > 0 ? `${value} %` : '—'}
    </Typography>
  </Box>
)

export default RateBar
