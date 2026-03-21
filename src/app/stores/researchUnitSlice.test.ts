import { createStore, StoreApi } from 'zustand'
import { addResearchUnitSlice, ResearchUnitSlice } from './researchUnitSlice'
import { i18n } from '@lingui/core'
import { ResearchUnitIdentifierType } from '@prisma/client'
import { Literal } from '@/types/Literal'
import { ResearchUnit } from '@/types/ResearchUnit'

const mockFetchResponse = (
  data: {
    hasMore: boolean
    researchUnits: ResearchUnit[]
    total: number
  },
  ok = true,
) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(data),
    } as Response),
  )
}

const mockFetchError = (error: Error) => {
  global.fetch = jest.fn(() => Promise.reject(error))
}

describe('addResearchUnitSlice', () => {
  let store: StoreApi<ResearchUnitSlice>

  beforeEach(() => {
    store = createStore(addResearchUnitSlice)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should fetch and store research units successfully', async () => {
    const researchUnitsData = [
      new ResearchUnit(
        'RS123',
        'ABC',
        [new Literal('Valid Research Unit', 'en')],
        [new Literal('Valid Description', 'en')],
        'ABCD_signature',
        [
          { type: ResearchUnitIdentifierType.nns, value: '12345' },
          { type: ResearchUnitIdentifierType.ror, value: '67890' },
        ],
      ),
      new ResearchUnit(
        'RS124',
        'ADF',
        [new Literal('Valid Research Unit', 'en')],
        [new Literal('Valid Description', 'en')],
        'ADF_signature',
        [
          { type: ResearchUnitIdentifierType.nns, value: '12345' },
          { type: ResearchUnitIdentifierType.ror, value: '67890' },
        ],
      ),
    ]
    const response = {
      hasMore: true,
      researchUnits: researchUnitsData,
      total: 2,
    }
    mockFetchResponse(response)

    await store.getState().researchUnit.fetchResearchUnitsByName({
      page: 1,
      searchTerm: 'test',
    })

    const state = store.getState().researchUnit
    expect(state.loading).toBe(false)
    expect(state.researchUnits).toEqual(researchUnitsData)
    expect(state.hasMore).toBe(true)
    expect(state.total).toBe(2)
    expect(state.error).toBe(null)
    expect(fetch).toHaveBeenCalledWith(
      '/api/researchUnits?searchTerm=test&page=1&includeExternal=',
      expect.objectContaining({
        headers: { 'accept-language': i18n.locale },
      }),
    )
  })

  it('should handle fetch error correctly', async () => {
    const errorMessage = 'Network error'
    mockFetchError(new Error(errorMessage))

    await store.getState().researchUnit.fetchResearchUnitsByName({
      page: 1,
      searchTerm: 'test',
    })

    const state = store.getState().researchUnit
    expect(state.loading).toBe(false)
    expect(state.researchUnits).toEqual([])
    expect(state.error).toEqual('Network error')
  })

  it('should append research unit data on subsequent pages', async () => {
    const initialResearchUnits = [
      new ResearchUnit(
        'RS123',
        'ABC',
        [new Literal('Valid Research Unit', 'en')],
        [new Literal('Valid Description', 'en')],
        'ABC_signature',
        [
          { type: ResearchUnitIdentifierType.nns, value: '12345' },
          { type: ResearchUnitIdentifierType.ror, value: '67890' },
        ],
      ),
    ]
    const newResearchUnits = [
      new ResearchUnit(
        'RS124',
        'ADF',
        [new Literal('Valid Research Unit', 'en')],
        [new Literal('Valid Description', 'en')],
        'ADF_signature',
        [
          { type: ResearchUnitIdentifierType.nns, value: '12345' },
          { type: ResearchUnitIdentifierType.ror, value: '67890' },
        ],
      ),
    ]
    const responsePage1 = {
      hasMore: true,
      researchUnits: initialResearchUnits,
      total: 2,
    }
    const responsePage2 = {
      hasMore: false,
      researchUnits: newResearchUnits,
      total: 2,
    }

    mockFetchResponse(responsePage1)
    await store.getState().researchUnit.fetchResearchUnitsByName({
      page: 1,
      searchTerm: '',
    })

    mockFetchResponse(responsePage2)
    await store.getState().researchUnit.fetchResearchUnitsByName({
      page: 2,
      searchTerm: '',
    })

    const state = store.getState().researchUnit
    expect(state.researchUnits).toEqual([
      ...initialResearchUnits,
      ...newResearchUnits,
    ])
    expect(state.hasMore).toBe(false)
    expect(state.total).toBe(2)
  })
})
