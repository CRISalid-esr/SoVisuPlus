import { applyTabScope } from '@/app/[lang]/documents/hooks/documentTable/utils/columns'
import {
  ALL_DOCUMENTS_TAB,
  OUTSIDE_HAL_TAB,
} from '@/app/[lang]/documents/hooks/documentTable/utils/tabs'
import {
  HalStatusFilterValue,
  OUTSIDE_HAL_TAB_STATUSES,
} from '@/types/HalStatusFilter'

describe('applyTabScope', () => {
  const typeFilter = { id: 'type', value: ['Book'] }

  it('leaves the filters untouched on the all-documents tab', () => {
    const filters = [typeFilter]

    expect(applyTabScope(filters, ALL_DOCUMENTS_TAB)).toBe(filters)
  })

  it('does not touch a halStatus filter set on the all-documents tab', () => {
    const filters = [
      { id: 'halStatus', value: [HalStatusFilterValue.InCollection] },
    ]

    expect(applyTabScope(filters, ALL_DOCUMENTS_TAB)).toEqual(filters)
  })

  it('injects the whole allowed set when the HAL tab has no halStatus filter', () => {
    expect(applyTabScope([typeFilter], OUTSIDE_HAL_TAB)).toEqual([
      typeFilter,
      { id: 'halStatus', value: OUTSIDE_HAL_TAB_STATUSES },
    ])
  })

  it('keeps a user selection that is within the allowed set', () => {
    const filters = [
      { id: 'halStatus', value: [HalStatusFilterValue.OutsideHal] },
    ]

    expect(applyTabScope(filters, OUTSIDE_HAL_TAB)).toEqual([
      { id: 'halStatus', value: [HalStatusFilterValue.OutsideHal] },
    ])
  })

  it('falls back to the allowed set when a stale value is not allowed here', () => {
    const filters = [
      { id: 'halStatus', value: [HalStatusFilterValue.InCollection] },
    ]

    expect(applyTabScope(filters, OUTSIDE_HAL_TAB)).toEqual([
      { id: 'halStatus', value: OUTSIDE_HAL_TAB_STATUSES },
    ])
  })

  it('drops the disallowed values of a mixed selection', () => {
    const filters = [
      {
        id: 'halStatus',
        value: [
          HalStatusFilterValue.InCollection,
          HalStatusFilterValue.OutsideHal,
        ],
      },
    ]

    expect(applyTabScope(filters, OUTSIDE_HAL_TAB)).toEqual([
      { id: 'halStatus', value: [HalStatusFilterValue.OutsideHal] },
    ])
  })

  it('replaces the existing halStatus entry instead of duplicating it', () => {
    const filters = [
      typeFilter,
      { id: 'halStatus', value: [HalStatusFilterValue.OutOfCollection] },
    ]

    const scoped = applyTabScope(filters, OUTSIDE_HAL_TAB)

    expect(scoped.filter((filter) => filter.id === 'halStatus')).toHaveLength(1)
    expect(scoped).toContainEqual(typeFilter)
  })

  it('scopes a non-array halStatus value to the allowed set', () => {
    const filters = [{ id: 'halStatus', value: 'in_collection' }]

    expect(applyTabScope(filters, OUTSIDE_HAL_TAB)).toEqual([
      { id: 'halStatus', value: OUTSIDE_HAL_TAB_STATUSES },
    ])
  })
})
