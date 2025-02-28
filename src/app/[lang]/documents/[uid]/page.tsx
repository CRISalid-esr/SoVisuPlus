'use client'

import { TabFilter } from '@/components/TabFilter'
import useStore from '@/stores/global_store'
import { t } from '@lingui/macro'
import { Box, CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import DocumentDetailsHeader from './components/DocumentDetailsHeader'
import DocumentDetailsTitle from './components/DocumentDetailsTitle'
import BibliographicInformation from './components/BibliographicInformation/BibliographicInformation'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function DocumentDetailsPage() {
  const theme = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { uid } = useParams<{ uid: string }>()

  const tabs = [
    {
      label: t`document_details_bibliographic_information_tab`,
      value: 'bibliographic_information',
      color: theme.palette.primary.main,
    },
    {
      label: t`document_details_keywords_tab`,
      value: 'keywords',
      color: theme.palette.primary.main,
    },
    {
      label: t`document_details_domains_tab`,
      value: 'domains',
      color: theme.palette.primary.main,
    },
    {
      label: t`document_details_HAL_referencing_tab`,
      value: 'HAL_referencing',
      color: theme.palette.primary.main,
    },
    {
      label: t`document_details_authors_tab`,
      value: 'authors',
      color: theme.palette.primary.main,
    },
  ]

  const initialTab = searchParams.get('tab') || ''
  const [selectedTab, setSelectedTab] = useState(initialTab)

  const { fetchDocumentById, loading, selectedDocument, hasFetched } = useStore(
    (state) => state.document,
  )

  useEffect(() => {
    if (uid && !hasFetched) {
      fetchDocumentById(uid)
    }
  }, [uid, fetchDocumentById, hasFetched])

  useEffect(() => {
    setSelectedTab(initialTab)
  }, [initialTab])

  if (!hasFetched || loading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='100vh'
      >
        <CircularProgress />
      </Box>
    )
  }

  // ✅ Only redirect to 404 **after Zustand has fetched**
  if (hasFetched && !loading && selectedDocument === null) {
    return notFound()
  }

  const handleTabChange = (newValue: string) => {
    setSelectedTab(newValue)
    router.push(`?tab=${newValue}`, { scroll: false })
  }

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'bibliographic_information':
        return <BibliographicInformation />
      default:
        return notFound()
    }
  }

  return (
    <Box>
      <DocumentDetailsHeader />
      <DocumentDetailsTitle />
      <TabFilter
        tabsData={tabs}
        selectedValue={selectedTab}
        onTabChange={handleTabChange}
      />
      {renderTabContent()}
    </Box>
  )
}
