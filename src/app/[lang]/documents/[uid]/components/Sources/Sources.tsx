import { CustomCard } from '@/components/Card'
import { DocumentRecord } from '@/types/DocumentRecord'
import { Trans } from '@lingui/react'
import { Box, CardContent, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { MaterialReactTable } from 'material-react-table'
import React from 'react'
import { useSourcesTable } from '@/app/[lang]/documents/[uid]/hooks/useSourcesTable'

const Sources = () => {
  const theme = useTheme()

  const { table } = useSourcesTable()

  return (
    <CustomCard
      header={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            sx={{
              color: theme.palette.primary.main,
              fontSize: theme.utils.pxToRem(20),
              fontStyle: 'normal',
              fontWeight: theme.typography.fontWeightRegular,
              lineHeight: 'normal',
            }}
          >
            <Trans id='document_details_page_source_tab_card_title' />
          </Typography>
        </Box>
      }
    >
      <CardContent>
        <MaterialReactTable<DocumentRecord> table={table} />
      </CardContent>
    </CustomCard>
  )
}

export default Sources
