import { CustomCard } from '@/components/Card'
import useStore from '@/stores/global_store'
import { DocumentRecord } from '@/types/DocumentRecord'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { Localization } from '@/types/Localization'
import * as Lingui from '@lingui/core'
import { Trans } from '@lingui/react'
import { Box, Button, CardContent, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { MaterialReactTable, MRT_ColumnDef } from 'material-react-table'
import { useMemo } from 'react'

function Sources() {
  const { selectedDocument = null } = useStore((state) => state.document)
  const theme = useTheme()
  const lang = Lingui.i18n.locale as ExtendedLanguageCode

  const columns = useMemo<MRT_ColumnDef<DocumentRecord>[]>(() => [], [])

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
            <Trans id='document_details_page_card_title' />
          </Typography>
          <Button variant='contained' color='primary'>
            <Trans id='document_details_page_card_validate_button' />
          </Button>
        </Box>
      }
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: theme.spacing(4),
        }}
      >
        <MaterialReactTable
          initialState={{ showColumnFilters: true }}
          enableColumnResizing
          columns={columns}
          rowCount={selectedDocument?.records.length || 0}
          data={selectedDocument?.records || []}
          enablePagination
          localization={Localization[lang]}
          enableRowActions
        />
      </CardContent>
    </CustomCard>
  )
}

export default Sources
