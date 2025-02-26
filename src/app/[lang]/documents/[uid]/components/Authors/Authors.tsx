import useStore from '@/stores/global_store'
import { Contribution } from '@/types/Contribution'
import { Box, Paper, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { t } from '@lingui/macro'
import React, { useMemo } from 'react'
import { MaterialReactTable, MRT_ColumnDef } from 'material-react-table'
import { Localization } from '@/types/Localization'
import * as Lingui from '@lingui/core'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { Person } from '@/types/Person'

const Authors = () => {
  const { selectedDocument = null } = useStore((state) => state.document)
  const theme = useTheme()
  const lang = Lingui.i18n.locale as ExtendedLanguageCode

  console.log('selectedDocument', selectedDocument)

  const columns = useMemo<MRT_ColumnDef<Contribution>[]>(() => {
    return [
      {
        id: 'person',
        header: t`documents_page_type_column`,
        accessor: (row: { person: Person }) => row.person,
        Cell({ row }: { row: { person: Person } }) {
          return <Box>{row.person?.displayName}</Box>
        },
      },
      {
        id: 'affiliation',
        header: 'Affiliation',
        //  accessor: (row) => row.affiliation,
      },
      {
        id: 'orcid',
        header: 'ORCID',
        //  accessor: (row) => row.orcid,
      },
    ]
  }, [])

  return (
    <Paper elevation={0}>
      <Box>
        <Typography variant='h6'>Authors</Typography>
      </Box>
      <Box>
        <MaterialReactTable
          initialState={{ showColumnFilters: true }}
          columns={columns}
          data={selectedDocument?.contributions || []}
          localization={Localization[lang]}
          enableRowActions
          positionActionsColumn='last' // Ensures actions column is at the right end
        />
      </Box>
    </Paper>
  )
}

export default Authors
