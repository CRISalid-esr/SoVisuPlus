import { createStore } from 'zustand'
import { addPersonSlice, PersonSlice } from './personSlice'
import { i18n } from '@lingui/core'
import { Person } from '@/types/Person'
const mockFetchResponse = (data: Person[], ok = true) => {
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

describe('addPersonSlice', () => {
  let store: ReturnType<typeof createStore<PersonSlice>>

  beforeEach(() => {
    store = createStore(addPersonSlice)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should fetch and store people successfully', async () => {
    const peopleData = [
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' },
    ]
    const response = { hasMore: true, people: peopleData, total: 2 }
    mockFetchResponse(response)

    await store.getState().person.fetchPeople({ page: '1', searchTerm: 'test' })

    const state = store.getState().person
    expect(state.loading).toBe(false)
    expect(state.people).toEqual(peopleData)
    expect(state.hasMore).toBe(true)
    expect(state.total).toBe(2)
    expect(state.error).toBe(null)
    expect(fetch).toHaveBeenCalledWith(
      '/api/people?page=1&searchTerm=test',
      expect.objectContaining({
        headers: { 'accept-language': i18n.locale },
      }),
    )
  })

  it('should handle fetch error correctly', async () => {
    const errorMessage = 'Network error'
    mockFetchError(new Error(errorMessage))

    await store.getState().person.fetchPeople({ page: '1', searchTerm: 'test' })

    const state = store.getState().person
    expect(state.loading).toBe(false)
    expect(state.people).toEqual([])
    expect(state.error).toEqual(new Error(errorMessage))
  })

  it('should append people data on subsequent pages', async () => {
    const initialPeople = [{ id: 1, name: 'John Doe' }]
    const newPeople = [{ id: 2, name: 'Jane Smith' }]
    const responsePage1 = { hasMore: true, people: initialPeople, total: 2 }
    const responsePage2 = { hasMore: false, people: newPeople, total: 2 }

    mockFetchResponse(responsePage1)
    await store.getState().person.fetchPeople({ page: '1', searchTerm: '' })

    mockFetchResponse(responsePage2)
    await store.getState().person.fetchPeople({ page: '2', searchTerm: '' })

    const state = store.getState().person
    expect(state.people).toEqual([...initialPeople, ...newPeople])
    expect(state.hasMore).toBe(false)
    expect(state.total).toBe(2)
  })
})
