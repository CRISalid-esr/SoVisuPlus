import useStore from '@/stores/global_store'
import { Contribution } from '@/types/Contribution'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { Localization } from '@/types/Localization'
import { Person } from '@/types/Person'
import * as Lingui from '@lingui/core'
import { t } from '@lingui/macro'
import { Box, Paper, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  MaterialReactTable,
  MRT_Cell,
  MRT_ColumnDef,
  useMaterialReactTable,
} from 'material-react-table'
import { ReactNode, useMemo } from 'react'
const Authors = () => {
  const { selectedDocument = null } = useStore((state) => state.document)
  const theme = useTheme()
  const lang = Lingui.i18n.locale as ExtendedLanguageCode

  const columns = useMemo<MRT_ColumnDef<Contribution>[]>(
    () => [
      {
        id: 'person',
        header: t`documents_details_page_type_column_tab_select`,
        accessor: (row: { person: Person }) => row.person,
        Cell({
          cell,
          renderedCellValue,
        }: {
          cell: MRT_Cell<Contribution>
          renderedCellValue: ReactNode
        }) {
          const { row } = cell
          return <Box>{row.original.person?.displayName}</Box>
        },
      },
      {
        id: 'idref',
        header: t`documents_details_page_idref_column_tab_select`,
      },
      {
        id: 'orcid',
        header: t`documents_details_page_orcid_column_tab_select`,
      },
      {
        id: 'idhal',
        header: t`documents_details_page_idhal_column_tab_select`,
      },
      {
        id: 'scopus',
        header: t`documents_details_page_scopus_column_tab_select`,
      },
    ],
    [],
  )

  const table = useMaterialReactTable({
    columns,
    data: selectedDocument?.contributions || [],
    enableRowSelection: true,
    localization:Localization[lang]
  })

  return (
    <Paper elevation={0}>
      <Box>
        <Typography variant='h6'>Authors</Typography>
      </Box>
      <Box>
        <MaterialReactTable table={table} />;
      </Box>
    </Paper>
  )
}

export default Authors
