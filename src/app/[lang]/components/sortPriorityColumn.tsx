import { t } from '@lingui/core/macro'
import { Box } from '@mui/material'
import {
  MRT_ColumnDef,
  MRT_Header,
  MRT_RowData,
  MRT_TableHeadCellSortLabel,
  MRT_TableInstance,
} from 'material-react-table'

/**
 * When several columns are sorted, appends the column's sort priority to its
 * "sorted by" tooltip (e.g. "Sorted by Name ascending (priority 2)").
 */
export const withSortPriorityLocalization = <T extends MRT_RowData>(
  table: MRT_TableInstance<T>,
  header: MRT_Header<T>,
): MRT_TableInstance<T> => {
  const { sorting } = table.getState()
  if (sorting.length < 2 || !header.column.getIsSorted()) return table
  const suffix = ` (${t`table_sort_priority`} ${header.column.getSortIndex() + 1})`
  const { localization } = table.options
  return {
    ...table,
    options: {
      ...table.options,
      localization: {
        ...localization,
        sortedByColumnAsc: localization.sortedByColumnAsc + suffix,
        sortedByColumnDesc: localization.sortedByColumnDesc + suffix,
      },
    },
  }
}

/** Hides MRT's default sort label, replaced by the one of SortableHeader. */
export const HIDE_DEFAULT_SORT_LABEL_SX = {
  '& .Mui-TableHeadCell-Content-Labels > .MuiBadge-root': {
    display: 'none',
  },
}

/** Column title followed by a sort label whose tooltip shows the priority. */
export const SortableHeader = <T extends MRT_RowData>({
  header,
  table,
}: {
  header: MRT_Header<T>
  table: MRT_TableInstance<T>
}) => (
  <Box component='span' sx={{ display: 'flex', alignItems: 'center' }}>
    <Box component='span' sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {header.column.columnDef.header}
    </Box>
    {header.column.getCanSort() && (
      <MRT_TableHeadCellSortLabel
        header={header}
        table={withSortPriorityLocalization(table, header)}
      />
    )}
  </Box>
)

/**
 * Gives a column a sort tooltip mentioning its priority among the sorted
 * columns. Header cell props must be a plain object (merged with the sx that
 * hides MRT's default sort label).
 */
export const sortPriorityColumn = <T extends MRT_RowData>(
  column: Omit<MRT_ColumnDef<T>, 'Header' | 'muiTableHeadCellProps'> & {
    muiTableHeadCellProps?: Record<string, unknown>
  },
): MRT_ColumnDef<T> => ({
  ...column,
  muiTableHeadCellProps: {
    ...column.muiTableHeadCellProps,
    sx: HIDE_DEFAULT_SORT_LABEL_SX,
  },
  Header({ header, table }) {
    return <SortableHeader header={header} table={table} />
  },
})
