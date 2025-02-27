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

export default function DocumentDetailsPage() {
  const theme = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()

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

  // Get the initial tab from the URL query parameter, defaulting to the first tab's value
  const initialTab = searchParams.get('tab') || ''
  const [selectedTab, setSelectedTab] = useState(initialTab)

  const { uid } = useParams() // Get the document UID from the URL
  const {
    fetchDocumentById,
    loading,
    selectedDocument = null,
  } = useStore((state) => state.document)

  useEffect(() => {
    if (uid && fetchDocumentById) {
      fetchDocumentById(uid as string)
    }
  }, [uid, fetchDocumentById])

  // Update the tab state if the URL query parameter changes
  useEffect(() => {
    setSelectedTab(initialTab)
  }, [initialTab])

  if (loading || !selectedDocument) {
    return (
      <Box>
        <CircularProgress />
      </Box>
    )
  }

  const handleTabChange = (newValue: string) => {
    setSelectedTab(newValue)
    // Update the URL with the new tab query parameter without scrolling to the top
    router.push(`?tab=${newValue}`, { scroll: false })
  }

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'bibliographic_information':
        return <BibliographicInformation />
      default:
        return <BibliographicInformation />
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
