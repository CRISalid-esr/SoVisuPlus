'use client'

import { useParams } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import useStore from '@/stores/global_store'
import { t } from '@lingui/macro'
import { useTheme } from '@mui/material/styles'
import { TabFilter } from '@/components/TabFilter'
import DocumentDetailsHeader from './components/DocumentDetailsHeader'
import DocumentDetailsTitle from './components/DpcumentDetailsTtitle'
import DocumentDetailsCard from './components/DocumentDetailsCard'

export default function DocumentDetailsPage() {
  const theme = useTheme()

  const tabs = [
    {
      label: t`document_details_bibliographic_information`,
      value: 'bibliographic_information',
      color: theme.palette.primary.main,
    },
    {
      label: t`document_details_keywords`,
      value: 'keywords',
      color: theme.palette.primary.main,
    },
    {
      label: t`document_details_domains`,
      value: 'document_details_domains',
      color: theme.palette.primary.main,
    },
    {
      label: t`document_details_domains`,
      value: 'domains',
      color: theme.palette.primary.main,
    },
    {
      label: t`document_details_HAL_referencing`,
      value: 'HAL_referencing',
      color: theme.palette.primary.main,
    },
    {
      label: t`document_details_authors`,
      value: 'authors',
      color: theme.palette.primary.main,
    },
  ]
  const [selectedTab, setSelectedTab] = useState(tabs[0].value)

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

  const handleTabChange = (newValue: string) => {
    setSelectedTab(newValue)
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
      <DocumentDetailsCard />
    </Box>
  )
}
