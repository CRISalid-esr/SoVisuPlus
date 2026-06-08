'use client'

import { t } from '@lingui/core/macro'
import { TabFilter } from '@/components/TabFilter'
import useStore from '@/stores/global_store'
import { Alert, Box, CircularProgress, Link, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { notFound, useParams, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
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
import { Trans } from '@lingui/react'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import UpdateInHAL from '@/app/[lang]/documents/[uid]/components/HAL/UpdateInHAL/UpdateInHAL'
import AddInHAL from '@/app/[lang]/documents/[uid]/components/HAL/AddInHAL/AddInHAL'
import {
  useBlockNavigation,
  useGuardedRouter,
} from '@/app/[lang]/components/NavigationGuard/NavigationGuardProvider'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'

const DocumentDetailsPage = () => {
  const theme = useTheme()
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

  const {
    fetchDocumentById,
    loading,
    selectedDocument,
    hasFetched,
    setHasFetched,
  } = useStore((state) => state.document)

  if (selectedDocument?.hasBeenUpdated()) {
    tabs.push({
      label: t`document_details_update_in_hal_tab`,
      value: 'update_in_hal',
      color: theme.palette.primary.main,
    })
  }
  const halRecord = selectedDocument?.records.find(
    (record) => record.platform === BibliographicPlatform.HAL,
  )
  if (!halRecord) {
    tabs.push({
      label: t`document_details_add_in_hal_tab`,
      value: 'add_in_hal',
      color: theme.palette.primary.main,
    })
  }

  useEffect(() => {
    if (selectedDocument?.uid == uid && hasFetched) {
      return
    }
    if (uid) {
      fetchDocumentById(uid)
    }
  }, [uid, fetchDocumentById, hasFetched, selectedDocument])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setSelectedTab(tab)
    }
  }, [searchParams])

  const {
    selectedDocumentHasChanged,
    setSelectedDocumentHasChanged,
    contributionsTabDirty,
  } = useStore((state) => state.document)

  // Block navigation while the Authors tab has unsaved edits. The provider drives
  // the confirmation modal for tabs, sidebar links, back/forward and reload alike.
  const guardedRouter = useGuardedRouter()
  useBlockNavigation(contributionsTabDirty)

  // Only editors see the frozen notice — read-only viewers never have controls to
  // freeze, so the message would be irrelevant noise to them.
  const { data: session } = useSession()
  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user?.authz),
    [session?.user?.authz],
  )
  const canEdit = !!(
    selectedDocument && ability.can(PermissionAction.update, selectedDocument)
  )

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

  // Routed through the guard so switching away from a dirty Authors tab prompts.
  const handleTabChange = (newValue: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', newValue)
    guardedRouter.push(`/${lang}/documents/${uid}?${params.toString()}`)
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
      case 'update_in_hal':
        return <UpdateInHAL />
      case 'add_in_hal':
        return <AddInHAL />
      default:
        return <BibliographicInformation />
    }
  }

  return (
    <Box>
      <DocumentDetailsHeader />
      {selectedDocumentHasChanged && (
        <Alert
          severity='info'
          sx={{ mb: 2 }}
          onClose={() => {
            setSelectedDocumentHasChanged(false)
          }}
        >
          <Typography component='span'>
            <Trans id='documents_page_refresh_document_alert' />
          </Typography>{' '}
          <Link
            component='button'
            onClick={() => {
              setHasFetched(false)
              setSelectedDocumentHasChanged(false)
            }}
            underline='always'
            sx={{ ml: 1 }}
          >
            {t`documents_page_refresh_document`}
          </Link>
        </Alert>
      )}
      <DocumentDetailsTitle />
      <TabFilter
        tabsData={tabs}
        selectedValue={selectedTab}
        onTabChange={handleTabChange}
      />
      {canEdit && selectedDocument?.isFrozen && (
        <Alert severity='info' sx={{ mb: 2 }}>
          <Trans id='document_details_page_frozen_notice' />
        </Alert>
      )}
      {renderTabContent()}
    </Box>
  )
}
export default DocumentDetailsPage
