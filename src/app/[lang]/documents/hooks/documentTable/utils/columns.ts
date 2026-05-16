import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { toUTCISOString } from '@/utils/toUTCISOString'
import { MRT_ColumnDef, MRT_RowData } from 'material-react-table'

dayjs.extend(utc)

/**
 * Adjust MRT column filters so that `date` range filters are converted to UTC ISO strings.
 */
export const normalizeDateFilters = (
  columnFilters: { id: string; value: unknown }[],
): { id: string; value: unknown }[] => {
  return columnFilters.map((filter) => {
    if (filter.id === 'date' && Array.isArray(filter.value)) {
      const [startDate, endDate] = filter.value as (string | null)[]
      return {
        ...filter,
        value: [toUTCISOString(startDate), toUTCISOString(endDate, true)],
      }
    }
    return filter
  })
}

export const getColumnIds = <T extends MRT_RowData>(
  columns: MRT_ColumnDef<T>[],
) => {
  return columns
    .map((c) => (typeof c.accessorKey === 'string' ? c.accessorKey : c.id))
    .filter(Boolean) as string[]
}
