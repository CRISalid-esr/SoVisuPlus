import useStore from '@/stores/global_store'
import { Contribution } from '@/types/Contribution'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { Localization } from '@/types/Localization'
import { Person } from '@/types/Person'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import * as Lingui from '@lingui/core'
import { t } from '@lingui/macro'
import { Box, Paper, Typography } from '@mui/material'
import {
  MaterialReactTable,
  MRT_ColumnDef,
  useMaterialReactTable,
} from 'material-react-table'
import { ReactNode, useMemo } from 'react'
const Authors = () => {
  const { selectedDocument = null } = useStore((state) => state.document)
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const columns = useMemo<MRT_ColumnDef<Contribution>[]>(
    () => [
      {
        id: 'person',
        header: t`documents_details_page_type_column_tab_author`,
        accessorFn: (row: { person: Person }) => row.person.displayName,
        enableFilterMatchHighlighting: true,
        Cell({ renderedCellValue }: { renderedCellValue: ReactNode }) {
          return (
            <Typography variant='body2' color='textSecondary'>
              {renderedCellValue}
            </Typography>
          )
        },
      },
      {
        id: 'idref',
        header: t`documents_details_page_idref_column_tab_select`,
        accessorFn: (row: { person: Person }) => {
          return row.person
            .getIdentifiers()
            .find(
              (identifier) => identifier.type === PersonIdentifierType.IDREF,
            )?.value
        },
        Cell({ renderedCellValue }: { renderedCellValue: ReactNode }) {
          return (
            <Typography variant='body2' color='textSecondary'>
              {renderedCellValue}
            </Typography>
          )
        },
      },
      {
        id: 'orcid',
        header: t`documents_details_page_orcid_column_tab_select`,
        accessorFn: (row: { person: Person }) => {
          return row.person
            .getIdentifiers()
            .find(
              (identifier) => identifier.type === PersonIdentifierType.ORCID,
            )?.value
        },
        Cell({ renderedCellValue }: { renderedCellValue: ReactNode }) {
          return (
            <Typography variant='body2' color='textSecondary'>
              {renderedCellValue}
            </Typography>
          )
        },
      },
      {
        id: 'idhal',
        header: t`documents_details_page_idhal_column_tab_select`,
        accessorFn: (row: { person: Person }) => {
          return row.person
            .getIdentifiers()
            .find(
              (identifier) => identifier.type === PersonIdentifierType.ID_HAL_I,
            )?.value
        },
        Cell({ renderedCellValue }: { renderedCellValue: ReactNode }) {
          return (
            <Typography variant='body2' color='textSecondary'>
              {renderedCellValue}
            </Typography>
          )
        },
      },
      {
        id: 'scopus',
        header: t`documents_details_page_scopus_column_tab_select`,
        accessorFn: (row: { person: Person }) => {
          return row.person
            .getIdentifiers()
            .find(
              (identifier) =>
                identifier.type === PersonIdentifierType.SCOPUS_EID,
            )?.value
        },
        Cell({ renderedCellValue }: { renderedCellValue: ReactNode }) {
          return (
            <Typography variant='body2' color='textSecondary'>
              {renderedCellValue}
            </Typography>
          )
        },
      },
    ],
    [],
  )

  const table = useMaterialReactTable({
    columns,
    data: selectedDocument?.contributions || [],
    enableRowSelection: true,
    localization: Localization[lang],
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
