import { t } from '@lingui/core/macro'
import { Box } from '@mui/material'
import {
  MRT_ColumnDef,
  MRT_Localization,
  MRT_RowData,
  MRT_TableHeadCellSortLabel,
  MRT_TableInstance,
} from 'material-react-table'
import { cloneElement, isValidElement, ReactElement } from 'react'

// Keys MRT assigns to the "sort ascending" / "sort descending" menu items
const SORT_ASC_MENU_ITEM_KEY = '1'
const SORT_DESC_MENU_ITEM_KEY = '2'

const alphabeticalSortLocalization = (
  localization: MRT_Localization,
): MRT_Localization => ({
  ...localization,
  sortByColumnAsc: t`table_sort_alphabetical_asc`,
  sortByColumnDesc: t`table_sort_alphabetical_desc`,
  sortedByColumnAsc: t`table_sorted_alphabetical_asc`,
  sortedByColumnDesc: t`table_sorted_alphabetical_desc`,
})

const withAlphabeticalSortLocalization = <T extends MRT_RowData>(
  table: MRT_TableInstance<T>,
): MRT_TableInstance<T> => ({
  ...table,
  options: {
    ...table.options,
    localization: alphabeticalSortLocalization(table.options.localization),
  },
})

/**
 * Material React Table localizes sorting labels per table ("ascending" /
 * "descending"). This helper gives a text column alphabetical sorting labels,
 * both in the sort icon tooltip and in the column actions menu.
 */
export const alphabeticalSortColumn = <T extends MRT_RowData>(
  column: Omit<
    MRT_ColumnDef<T>,
    'Header' | 'muiTableHeadCellProps' | 'renderColumnActionsMenuItems'
  >,
): MRT_ColumnDef<T> => ({
  ...column,
  // Hide MRT's default sort label: the Header below renders its own
  muiTableHeadCellProps: {
    sx: {
      '& .Mui-TableHeadCell-Content-Labels > .MuiBadge-root': {
        display: 'none',
      },
    },
  },
  Header({ column: { columnDef }, header, table }) {
    return (
      <Box component='span' sx={{ display: 'flex', alignItems: 'center' }}>
        <Box
          component='span'
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {columnDef.header}
        </Box>
        {header.column.getCanSort() && (
          <MRT_TableHeadCellSortLabel
            header={header}
            table={withAlphabeticalSortLocalization(table)}
          />
        )}
      </Box>
    )
  },
  renderColumnActionsMenuItems({ internalColumnMenuItems, table }) {
    const { sortByColumnAsc, sortByColumnDesc } = alphabeticalSortLocalization(
      table.options.localization,
    )
    return internalColumnMenuItems.map((item) => {
      if (!isValidElement(item)) return item
      if (item.key === SORT_ASC_MENU_ITEM_KEY) {
        return cloneElement(item as ReactElement<{ label: string }>, {
          label: sortByColumnAsc,
        })
      }
      if (item.key === SORT_DESC_MENU_ITEM_KEY) {
        return cloneElement(item as ReactElement<{ label: string }>, {
          label: sortByColumnDesc,
        })
      }
      return item
    })
  },
})
