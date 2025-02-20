'use client'

import { useParams } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import { useEffect } from 'react'
import useStore from '@/stores/global_store'

export default function DocumentDetailsPage() {
  const { uid } = useParams() // Get the document UID from the URL
  const {
    fetchDocumentById,
    loading,
    selectedDocument = null,
  } = useStore((state) => state.document)
  useEffect(() => {
    fetchDocumentById(uid as string)
  }, [uid])

  if (loading) {
    return <Typography>Loading...</Typography>
  }

  console.log('selectedDocument', selectedDocument)
  return (
    <Box>
      <Typography variant='h4'>Document Details</Typography>
      <Typography variant='body1'>UID: {uid}</Typography>
    </Box>
  )
}
