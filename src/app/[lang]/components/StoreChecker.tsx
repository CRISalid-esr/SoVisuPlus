'use client'
import useStore from 'src/app/stores/global_store'
import { useEffect, useState } from 'react'
import { Alert } from '@mui/material'

export default function StoreChecker() {
  const loading = useStore<boolean>((state) => state.publication.loading)
  const fetchPublications = useStore((state) => state.publication.fetchPublications)
  const [failure, setFailure] = useState<boolean>(false)
  useEffect(() => {
    fetchPublications().then(() => {
      setFailure(false)
    })
  }, [fetchPublications])
  if (loading && !failure) {
    return <Alert severity='info'>Waiting for server data...</Alert>
  }
  if (failure) {
    return <Alert severity='error'>Failed to load server data</Alert>
  }
  return <Alert severity='success'>Server data loaded</Alert>
}
