'use client'

import { useParams } from 'next/navigation'
import { Box, Typography } from '@mui/material'

export default function DocumentDetailsPage() {
  const { uid } = useParams() // Get the document UID from the URL

  return (
    <Box>
      <Typography variant='h4'>Document Details</Typography>
      <Typography variant='body1'>UID: {uid}</Typography>
    </Box>
  )
}
