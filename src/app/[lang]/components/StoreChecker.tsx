'use client'
import useStore from 'src/app/stores/global_store'
import { useEffect, useState } from 'react'
import { Alert } from '@mui/material'

export default function StoreChecker() {
  const loading = useStore<boolean>((state) => state.document.loading)
  const fetchDocuments = useStore((state) => state.document.fetchDocuments)
  const [failure, setFailure] = useState<boolean>(false)
  useEffect(() => {
    fetchDocuments({
      page: 1,
      searchTerm: '',
      pageSize: 0,
      columnFilters: '',
      searchLang: '',
      sorting: '',
      contributorUid: null,
      contributorType: 'person',
    }).then(() => {
      setFailure(false)
    })
  }, [fetchDocuments])
  if (loading && !failure) {
    return <Alert severity='info'>Waiting for server data...</Alert>
  }
  if (failure) {
    return <Alert severity='error'>Failed to load server data</Alert>
  }
  return <Alert severity='success'>Server data loaded</Alert>
}
