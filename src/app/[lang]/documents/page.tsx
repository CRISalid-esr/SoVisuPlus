'use client'
import { t } from '@lingui/core/macro'
import './page.css'
import { TabFilter } from '@/components/TabFilter'
import useStore from '@/stores/global_store'
import { isPerson } from '@/types/Person'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { Document } from '@/types/Document'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import * as Lingui from '@lingui/core'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { MaterialReactTable } from 'material-react-table'
import { useRouter, useSearchParams } from 'next/navigation' // Import useRouter
import React, { useEffect, useMemo, useState } from 'react'
import DocumentHeader from './components/DocumentHeader'
import SyncIcon from '@mui/icons-material/Sync'
import DocumentSyncDialog from '@/app/[lang]/documents/components/documentsSyncModal/DocumentSyncDialog'
import { Trans, useLingui } from '@lingui/react'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { Can } from '@casl/react'
import NextLink from 'next/link'
import { usePublicationsTable } from '@/app/[lang]/documents/components/publicationsTable/hooks/usePublicationsTable'
import MergeDialog from '@/app/[lang]/documents/components/MergeDialog'

dayjs.extend(utc)

const DocumentsPage = () => {
  const { data: session } = useSession()
  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user.authz),
    [session?.user?.authz],
  )
  const { _ } = useLingui()

  const [openDialog, setOpenDialog] = useState(false)

  const lang = Lingui.i18n.locale as ExtendedLanguageCode

  const [openSynchronizeModal, setOpenSynchronizeModal] =
    useState<boolean>(false)
  const [triggerReloadList, setTriggerReloadList] = useState<boolean>(false)
  const { currentPerspective, ownPerspective } = useStore((state) => state.user)

  const harvestings = useStore((state) => state.harvesting.harvestings)
  const currentPerspectiveHarvesting =
    harvestings[currentPerspective?.uid || '']
  const isAnyHarvestingRunning = Object.values(
    currentPerspectiveHarvesting || {},
  ).some((h) => h?.status === 'running')

  const warnMissingIdentifierTypes = (
    process.env.NEXT_PUBLIC_WARN_MISSING_IDENTIFIER_TYPES ?? ''
  )
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean) as PersonIdentifierType[]

  const missingIdentifiers =
    ownPerspective && isPerson(currentPerspective)
      ? warnMissingIdentifierTypes
          .filter((type) => !currentPerspective.hasIdentifier(type))
          .map((type) => PersonIdentifier.getLabelForType(type))
          .join(` ${_({ id: 'common_and_or', message: 'and/or' })} `) || null
      : null

  const theme = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    count: { allItems, incompleteHalRepositoryItems },
    listHasChanged,
    setListHasChanged,
    mergeDocuments,
  } = useStore((state) => state.document)

  const tabs = [
    {
      label: t`documents_page_all_documents_filter`,
      value: 'all_documents',
      numberOfItems: allItems,
      color: theme.palette.primary.main,
    },
    {
      label: t`documents_page_incomplete_hal_repository_filter`,
      value: 'incomplete_hal_repository',
      numberOfItems: incompleteHalRepositoryItems,
      color: theme.palette.error.main,
    },
  ]

  const [selectedTab, setSelectedTab] = useState(tabs[0].value)

  useEffect(() => {
    const tab = searchParams.get('tab')

    setSelectedTab(tab ?? 'all_documents')
  }, [searchParams])

  const handleTabChange = (newValue: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', newValue)

    router.push(`/${lang}/documents?${params.toString()}`)
  }
  const { table, selectedDocuments } = usePublicationsTable(
    selectedTab,
    triggerReloadList,
    setOpenDialog,
  )

  const onMergeDocuments = async (documentUids: string[]) => {
    if (documentUids.length < 2) return
    try {
      await mergeDocuments(documentUids)
      setTriggerReloadList((prev) => !prev)
    } catch (error) {
      console.error('Error merging documents:', error)
    } finally {
      setOpenDialog(false)
      table.resetRowSelection()
    }
  }

  return (
    <Box>
      <DocumentHeader
        perspectiveName={
          currentPerspective?.getDisplayName(lang as ExtendedLanguageCode) || ''
        }
        pageName={
          ownPerspective
            ? t`documents_page_main_title_first_person`
            : t`documents_page_main_title`
        }
      >
        {listHasChanged && (
          <Alert
            severity='info'
            variant='filled'
            className='refresh-alert'
            onClose={() => setListHasChanged(false)}
          >
            <Typography component='span'>
              {ownPerspective && (
                <Trans id='documents_page_refresh_list_alert_own_perspective' />
              )}
              {ownPerspective || (
                <Trans
                  id='documents_page_refresh_list_alert_other_perspective'
                  values={{
                    name:
                      currentPerspective?.getDisplayName(
                        lang as ExtendedLanguageCode,
                      ) || '',
                  }}
                />
              )}
            </Typography>{' '}
            <Link
              component='button'
              onClick={() => {
                setTriggerReloadList((prev) => !prev)
                setListHasChanged(false)
              }}
              underline='always'
              sx={{ ml: 1 }}
            >
              {t`documents_page_refresh_list`}
            </Link>
          </Alert>
        )}

        {currentPerspective && (
          <Can
            I={PermissionAction.fetch_documents}
            a={currentPerspective}
            passThrough
            ability={ability}
          >
            {(allowed: boolean) => (
              <Button
                startIcon={
                  isAnyHarvestingRunning ? (
                    <CircularProgress size={18} thickness={4} />
                  ) : (
                    <SyncIcon />
                  )
                }
                variant='outlined'
                disabled={!allowed}
                onClick={() => setOpenSynchronizeModal(true)}
              >
                <Trans id='documents_page_synchronize_button' />
              </Button>
            )}
          </Can>
        )}
      </DocumentHeader>
      {missingIdentifiers && (
        <Alert severity='warning' sx={{ mb: 2 }}>
          <Trans id='documents_page_missing_identifiers_warning_prefix' />{' '}
          <Link
            component={NextLink}
            href={`/${lang}/account`}
            underline='always'
            color='inherit'
          >
            <Trans id='documents_page_missing_identifiers_account_page' />
          </Link>{' '}
          <Trans
            id='documents_page_missing_identifiers_warning_suffix'
            values={{ identifiers: missingIdentifiers }}
          />
        </Alert>
      )}
      <TabFilter
        tabsData={tabs}
        selectedValue={selectedTab}
        onTabChange={handleTabChange}
      />
      {currentPerspective && (
        <Can
          I={PermissionAction.fetch_documents}
          a={currentPerspective}
          ability={ability}
        >
          <DocumentSyncDialog
            openSynchronizeModal={openSynchronizeModal}
            setOpenSynchronizeModal={setOpenSynchronizeModal}
            personUid={currentPerspective?.uid || ''}
          />
        </Can>
      )}

      <MaterialReactTable<Document> table={table} />
      <MergeDialog
        open={openDialog}
        setOpen={setOpenDialog}
        onMerge={onMergeDocuments}
        initialSelectedDocuments={selectedDocuments}
      />
    </Box>
  )
}
export default DocumentsPage
