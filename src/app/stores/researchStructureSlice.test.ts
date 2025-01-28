import { createStore, StoreApi } from 'zustand'
import {
  addResearchStructureSlice,
  ResearchStructureSlice,
} from './researchStructureSlice'
import { i18n } from '@lingui/core'

const mockFetchResponse = (
  data: {
    hasMore: boolean
    researchStructures: { uid: number; name: string }[]
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
      { uid: 1, name: 'Research Structure A' },
      { uid: 2, name: 'Research Structure B' },
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
      searchLang: 'en',
    })

    const state = store.getState().researchStructure
    expect(state.loading).toBe(false)
    expect(state.researchStructures).toEqual(researchStructuresData)
    expect(state.hasMore).toBe(true)
    expect(state.total).toBe(2)
    expect(state.error).toBe(null)
    expect(fetch).toHaveBeenCalledWith(
      '/api/researchStructures?page=1&searchTerm=test&searchLang=en',
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
      searchLang: 'en',
    })

    const state = store.getState().researchStructure
    expect(state.loading).toBe(false)
    expect(state.researchStructures).toEqual([])
    expect(state.error).toEqual('Network error')
  })

  it('should append research structures data on subsequent pages', async () => {
    const initialResearchStructures = [{ uid: 1, name: 'Research Structure A' }]
    const newResearchStructures = [{ uid: 2, name: 'Research Structure B' }]
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
      searchLang: 'en',
    })

    mockFetchResponse(responsePage2)
    await store.getState().researchStructure.fetchResearchStructuresByName({
      page: 2,
      searchTerm: '',
      searchLang: 'en',
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
