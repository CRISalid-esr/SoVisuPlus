import dayjs from 'dayjs'
import {
  COLUMN_FILTERS_KEY,
  readInitialColumnFilters,
} from '@/app/[lang]/documents/hooks/documentTable/utils/persistence'
import {
  ALL_DOCUMENTS_TAB,
  OUTSIDE_HAL_TAB,
} from '@/app/[lang]/documents/hooks/documentTable/utils/tabs'

describe('readInitialColumnFilters', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('returns an empty map when nothing is stored', () => {
    expect(readInitialColumnFilters()).toEqual({})
  })

  it('returns an empty map when the stored value is not valid JSON', () => {
    sessionStorage.setItem(COLUMN_FILTERS_KEY, 'not json')

    expect(readInitialColumnFilters()).toEqual({})
  })

  it('reads the filters of each tab independently', () => {
    sessionStorage.setItem(
      COLUMN_FILTERS_KEY,
      JSON.stringify({
        [ALL_DOCUMENTS_TAB]: [{ id: 'type', value: ['Book'] }],
        [OUTSIDE_HAL_TAB]: [{ id: 'halStatus', value: ['outside_hal'] }],
      }),
    )

    expect(readInitialColumnFilters()).toEqual({
      [ALL_DOCUMENTS_TAB]: [{ id: 'type', value: ['Book'] }],
      [OUTSIDE_HAL_TAB]: [{ id: 'halStatus', value: ['outside_hal'] }],
    })
  })

  it('revives date filters as dayjs instances, per tab', () => {
    sessionStorage.setItem(
      COLUMN_FILTERS_KEY,
      JSON.stringify({
        [OUTSIDE_HAL_TAB]: [
          { id: 'date', value: ['2024-01-01T00:00:00.000Z', null] },
        ],
      }),
    )

    const [start, end] = readInitialColumnFilters()[OUTSIDE_HAL_TAB][0]
      .value as (dayjs.Dayjs | null)[]

    expect(dayjs.isDayjs(start)).toBe(true)
    expect(start?.toISOString()).toBe('2024-01-01T00:00:00.000Z')
    expect(end).toBeNull()
  })

  // Sessions opened before filters became per-tab hold a bare array.
  it('migrates the legacy array shape onto the first tab', () => {
    sessionStorage.setItem(
      COLUMN_FILTERS_KEY,
      JSON.stringify([{ id: 'type', value: ['Book'] }]),
    )

    expect(readInitialColumnFilters()).toEqual({
      [ALL_DOCUMENTS_TAB]: [{ id: 'type', value: ['Book'] }],
    })
  })
})
