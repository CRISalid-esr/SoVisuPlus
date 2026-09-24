'use client'

import { Trans } from '@lingui/react'
import { Box, Button, Paper, Typography } from '@mui/material'
import { usePathname, useRouter } from 'next/navigation'

const PerspectiveUnavailable = () => {
  const router = useRouter()
  const pathname = usePathname()
  const lang = pathname.split('/')[1]

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <Paper
        variant='outlined'
        sx={{ p: 4, maxWidth: 520, textAlign: 'center' }}
      >
        <Typography variant='h5' gutterBottom>
          <Trans id='perspective_unavailable_title' />
        </Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
          <Trans id='perspective_unavailable_description' />
        </Typography>
        <Button
          variant='contained'
          onClick={() => router.push(`/${lang}/dashboard`)}
        >
          <Trans id='perspective_unavailable_back_to_own_dashboard' />
        </Button>
      </Paper>
    </Box>
  )
}

export default PerspectiveUnavailable
