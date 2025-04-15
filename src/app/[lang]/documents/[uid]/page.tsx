'use client'

import { TabFilter } from '@/components/TabFilter'
import useStore from '@/stores/global_store'
import { t } from '@lingui/macro'
import { Box, CircularProgress } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  notFound,
  useParams,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Authors,
  BibliographicInformation,
  DocumentDetailsHeader,
  DocumentDetailsTitle,
  Domains,
  Keywords,
  Sources,
} from './components/'
import * as Lingui from '@lingui/core'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'

export default function DocumentDetailsPage() {
  const theme = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { uid } = useParams<{ uid: string }>()
  const lang = Lingui.i18n.locale as ExtendedLanguageCode

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
      label: t`document_details_sources_tab`,
      value: 'sources',
      color: theme.palette.primary.main,
    },
    {
      label: t`document_details_authors_tab`,
      value: 'authors',
      color: theme.palette.primary.main,
    },
  ]

  const [selectedTab, setSelectedTab] = useState('bibliographic_information')

  const { fetchDocumentById, loading, selectedDocument, hasFetched } = useStore(
    (state) => state.document,
  )

  useEffect(() => {
    if (selectedDocument?.uid == uid && hasFetched) {
      return
    }
    if (uid) {
      fetchDocumentById(uid)
    }
  }, [uid, fetchDocumentById, hasFetched])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setSelectedTab(tab)
    }
  }, [searchParams])

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
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', newValue)
    router.push(`/${lang}/documents/${uid}?${params.toString()}`)
  }

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'bibliographic_information':
        return <BibliographicInformation />
      case 'sources':
        return <Sources />
      case 'authors':
        return <Authors />
      case 'keywords':
        return <Keywords />
      case 'domains':
        return <Domains />
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
