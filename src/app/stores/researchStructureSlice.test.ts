import { createStore, StoreApi } from 'zustand'
import {
  addResearchStructureSlice,
  ResearchStructureSlice,
} from './researchStructureSlice'
import { i18n } from '@lingui/core'
import { ResearchStructureIdentifierType } from '@prisma/client'
import { Literal } from '@/types/Literal'
import { ResearchStructure } from '@/types/ResearchStructure'

const mockFetchResponse = (
  data: {
    hasMore: boolean
    researchStructures: ResearchStructure[]
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

describe('addResearchStructureSlice', () => {
  let store: StoreApi<ResearchStructureSlice>

  beforeEach(() => {
    store = createStore(addResearchStructureSlice)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should fetch and store research structures successfully', async () => {
    const researchStructuresData = [
      new ResearchStructure(
        'RS123',
        'ABC',
        [new Literal('Valid Research Structure', 'en')],
        [new Literal('Valid Description', 'en')],
        [
          { type: ResearchStructureIdentifierType.LOCAL, value: '12345' },
          { type: ResearchStructureIdentifierType.ROR, value: '67890' },
        ],
      ),
      new ResearchStructure(
        'RS124',
        'ADF',
        [new Literal('Valid Research Structure', 'en')],
        [new Literal('Valid Description', 'en')],
        [
          { type: ResearchStructureIdentifierType.LOCAL, value: '12345' },
          { type: ResearchStructureIdentifierType.ROR, value: '67890' },
        ],
      ),
    ]
    const response = {
      hasMore: true,
      researchStructures: researchStructuresData,
      total: 2,
    }
    mockFetchResponse(response)

    await store.getState().researchStructure.fetchResearchStructuresByName({
      page: 1,
      searchTerm: 'test',
    })

    const state = store.getState().researchStructure
    expect(state.loading).toBe(false)
    expect(state.researchStructures).toEqual(researchStructuresData)
    expect(state.hasMore).toBe(true)
    expect(state.total).toBe(2)
    expect(state.error).toBe(null)
    expect(fetch).toHaveBeenCalledWith(
      '/api/researchStructures?searchTerm=test&page=1&includeExternal=',
      expect.objectContaining({
        headers: { 'accept-language': i18n.locale },
      }),
    )
  })

  it('should handle fetch error correctly', async () => {
    const errorMessage = 'Network error'
    mockFetchError(new Error(errorMessage))

    await store.getState().researchStructure.fetchResearchStructuresByName({
      page: 1,
      searchTerm: 'test',
    })

    const state = store.getState().researchStructure
    expect(state.loading).toBe(false)
    expect(state.researchStructures).toEqual([])
    expect(state.error).toEqual('Network error')
  })

  it('should append research structures data on subsequent pages', async () => {
    const initialResearchStructures = [
      new ResearchStructure(
        'RS123',
        'ABC',
        [new Literal('Valid Research Structure', 'en')],
        [new Literal('Valid Description', 'en')],
        [
          { type: ResearchStructureIdentifierType.LOCAL, value: '12345' },
          { type: ResearchStructureIdentifierType.ROR, value: '67890' },
        ],
      ),
    ]
    const newResearchStructures = [
      new ResearchStructure(
        'RS124',
        'ADF',
        [new Literal('Valid Research Structure', 'en')],
        [new Literal('Valid Description', 'en')],
        [
          { type: ResearchStructureIdentifierType.LOCAL, value: '12345' },
          { type: ResearchStructureIdentifierType.ROR, value: '67890' },
        ],
      ),
    ]
    const responsePage1 = {
      hasMore: true,
      researchStructures: initialResearchStructures,
      total: 2,
    }
    const responsePage2 = {
      hasMore: false,
      researchStructures: newResearchStructures,
      total: 2,
    }

    mockFetchResponse(responsePage1)
    await store.getState().researchStructure.fetchResearchStructuresByName({
      page: 1,
      searchTerm: '',
    })

    mockFetchResponse(responsePage2)
    await store.getState().researchStructure.fetchResearchStructuresByName({
      page: 2,
      searchTerm: '',
    })

    const state = store.getState().researchStructure
    expect(state.researchStructures).toEqual([
      ...initialResearchStructures,
      ...newResearchStructures,
    ])
    expect(state.hasMore).toBe(false)
    expect(state.total).toBe(2)
  })
})
