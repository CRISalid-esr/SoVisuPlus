/**
 * Values accepted by the `halStatus` column filter of the publications table.
 * Shared between the client (filter dropdown, request building) and the server
 * (Prisma where clause in DocumentDAO) so both sides agree on the wire format.
 */
export enum HalStatusFilterValue {
  InCollection = 'in_collection',
  OutOfCollection = 'out_of_collection',
  OutsideHal = 'outside_hal',
}

/**
 * HAL statuses covered by the "HAL deposit" tab. The tab restricts its filter
 * dropdown to these values and scopes its query to them. Append InModeration
 * here when that status lands.
 */
export const OUTSIDE_HAL_TAB_STATUSES: string[] = [
  HalStatusFilterValue.OutsideHal,
]
