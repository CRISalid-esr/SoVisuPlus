'use client'

import { t, Trans } from '@lingui/macro'
import { Box, Button, Typography } from '@mui/material'
import { MaterialReactTable } from 'material-react-table'
import { useEffect, useMemo, useState } from 'react'

interface Document {
  titles: {
    fr?: string
  } | null
  [key: string]: any
}

import { TabFilter } from '@/components/TabFilter'
import { useTheme } from '@mui/system'
import SyncIcon from '@mui/icons-material/Sync'
import useStore from '@/stores/global_store'
import * as Lingui from '@lingui/core'

export default function DocumentsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const lang = Lingui.i18n.locale

  const columns = [
    {
      accessorKey: `titles.${lang}`, //access nested data with dot notation
      header: t`documents_page_title_column`,
      size: 150,
    },
  ]

  const theme = useTheme()

  const tabs = [
    {
      label: t`documents_page_all_documents_filter`,
      value: 'all_documents',
      color: theme.palette.primary.main,
    },
    {
      label: t`documents_page_incomplete_hal_repository_filter`,
      value: 'incomplete_hal_repository',
      numberOfItems: 2,
      color: theme.palette.primary.main,
    },
    {
      label: t`documents_page_keywords_to_validate`,
      value: 'keywords_to_validate',
      numberOfItems: 1,
      color: theme.palette.primary.main,
    },
  ]

  const [selectedTab, setSelectedTab] = useState(tabs[0].value)

  const memoizedColumns = useMemo(() => columns, [columns])

  const {
    fetchDocuments,
    loading,
    documents = [],
  } = useStore((state) => state.document)

  useEffect(() => {
    console.log('fetch')
    fetchDocuments({ page, pageSize, searchTerm: '' })
  }, [])

  const handleTabeChange = (newValue: string) => {
    setSelectedTab(newValue)
  }

  return (
    <Box>
      <Box
        mb={3}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: {
            xs: 'flex-start',
            md: 'center',
          },
          flexDirection: {
            xs: 'column',
            sm: 'row',
          },
        }}
      >
        <Box>
          <Typography variant='h4' gutterBottom>
            <Trans>documents_page_main_title</Trans>
          </Typography>
        </Box>
        <Button startIcon={<SyncIcon />} variant='outlined'>
          <Trans>documents_page_synchronize_button</Trans>
        </Button>
      </Box>
      <TabFilter
        tabsData={tabs}
        selectedValue={selectedTab}
        onTabChange={handleTabeChange}
      />
      <MaterialReactTable
        columns={memoizedColumns}
        data={documents}
        enablePagination
      />
    </Box>
  )
}
