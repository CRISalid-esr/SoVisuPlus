import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { toUTCISOString } from '@/utils/toUTCISOString'
import { MRT_ColumnDef, MRT_RowData } from 'material-react-table'
import { OUTSIDE_HAL_TAB } from '@/app/[lang]/documents/hooks/documentTable/utils/tabs'
import { OUTSIDE_HAL_TAB_STATUSES } from '@/types/HalStatusFilter'

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

/**
 * Restrict the filters sent to the API to the HAL statuses the selected tab
 * covers. Applied when building the request rather than written into the
 * table's filter state, so the tab's scope cannot be cleared from the filter
 * UI and any stale persisted value is sanitised on the way out.
 */
export const applyTabScope = (
  columnFilters: { id: string; value: unknown }[],
  selectedTab: string,
): { id: string; value: unknown }[] => {
  if (selectedTab !== OUTSIDE_HAL_TAB) return columnFilters

  const selected = columnFilters.find((filter) => filter.id === 'halStatus')
  const kept = Array.isArray(selected?.value)
    ? (selected.value as string[]).filter((value) =>
        OUTSIDE_HAL_TAB_STATUSES.includes(value),
      )
    : []

  // The tab's scope is the whole allowed set; a user selection narrows it.
  return [
    ...columnFilters.filter((filter) => filter.id !== 'halStatus'),
    { id: 'halStatus', value: kept.length ? kept : OUTSIDE_HAL_TAB_STATUSES },
  ]
}

export const getColumnIds = <T extends MRT_RowData>(
  columns: MRT_ColumnDef<T>[],
) => {
  return columns
    .map((c) => (typeof c.accessorKey === 'string' ? c.accessorKey : c.id))
    .filter(Boolean) as string[]
}
