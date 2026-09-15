import { createStore, StoreApi } from 'zustand'
import { addPersonSlice, PersonSlice } from './personSlice'
import { i18n } from '@lingui/core'
import { Person } from '@/types/Person'

const mockFetchResponse = (
  data: {
    hasMore: boolean
    people: Person[]
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

describe('addPersonSlice', () => {
  let store: StoreApi<PersonSlice>

  beforeEach(() => {
    store = createStore(addPersonSlice)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should fetch and store people successfully', async () => {
    const person: Person = new Person(
      'person-123',
      false,
      'john.doe@example.com',
      'John Doe',
      'John',
      'Doe',
      [],
    )
    const person2: Person = new Person(
      'person-1223',
      false,
      'Jane.smith@example.com',
      'Jane Smith',
      'Jane',
      'Doe',
      [],
    )
    const peopleData = [person, person2]
    const response = { hasMore: true, people: peopleData, total: 2 }
    mockFetchResponse(response)

    await store
      .getState()
      .person.fetchPeopleByName({ page: 1, searchTerm: 'test' })

    const state = store.getState().person
    expect(state.loading).toBe(false)
    expect(state.people).toEqual(peopleData)
    expect(state.hasMore).toBe(true)
    expect(state.total).toBe(2)
    expect(state.error).toBe(null)
    expect(fetch).toHaveBeenCalledWith(
      '/api/people?searchTerm=test&page=1&includeExternal=',
      expect.objectContaining({
        headers: { 'accept-language': i18n.locale },
      }),
    )
  })

  it('should handle fetch error correctly', async () => {
    const errorMessage = 'Network error'
    mockFetchError(new Error(errorMessage))

    await store
      .getState()
      .person.fetchPeopleByName({ page: 1, searchTerm: 'test' })

    const state = store.getState().person
    expect(state.loading).toBe(false)
    expect(state.people).toEqual([])
    expect(state.error).toEqual(new Error(errorMessage))
  })

  it('should append people data on subsequent pages', async () => {
    const initialPeople = [
      new Person(
        'person-123',
        false,
        'john.doe@example.com',
        'John Doe',
        'John',
        'Doe',
        [],
      ),
    ]
    const newPeople = [
      new Person(
        'person-1223',
        false,
        'Jane.smith@example.com',
        'Jane Smith',
        'Jane',
        'Doe',
        [],
      ),
    ]
    const responsePage1 = { hasMore: true, people: initialPeople, total: 2 }
    const responsePage2 = { hasMore: false, people: newPeople, total: 2 }

    mockFetchResponse(responsePage1)
    await store.getState().person.fetchPeopleByName({ page: 1, searchTerm: '' })

    mockFetchResponse(responsePage2)
    await store.getState().person.fetchPeopleByName({ page: 2, searchTerm: '' })

    const state = store.getState().person
    expect(state.people).toEqual([...initialPeople, ...newPeople])
    expect(state.hasMore).toBe(false)
    expect(state.total).toBe(2)
  })

  /**
   * fetch mock whose calls resolve only when the test says so, and reject with
   * an AbortError when their signal is aborted — like the real fetch.
   */
  const controllableFetch = () => {
    const pending: ((data: unknown) => void)[] = []
    global.fetch = jest.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          )
          pending.push((data) =>
            resolve({
              ok: true,
              json: () => Promise.resolve(data),
            } as Response),
          )
        }),
    )
    return pending
  }

  it('ignores the response of a search replaced by a newer one', async () => {
    const pending = controllableFetch()
    const { fetchPeopleByName } = store.getState().person
    const older = fetchPeopleByName({ page: 1, searchTerm: 'dupo' })
    const newer = fetchPeopleByName({ page: 1, searchTerm: 'dupont' })

    const dupont = new Person(
      'p-dupont',
      false,
      null,
      'Jean Dupont',
      'Jean',
      'Dupont',
      [],
    )
    pending[1]({ hasMore: false, people: [dupont], total: 1 })
    await newer
    // the older request was aborted: resolving it late changes nothing
    pending[0]({ hasMore: false, people: [], total: 0 })
    await older

    const { people, total, loading, error } = store.getState().person
    expect(people.map((person) => person.uid)).toEqual(['p-dupont'])
    expect(total).toBe(1)
    expect(loading).toBe(false)
    expect(error).toBeNull()
  })

  it('stays loading until the latest search completes', async () => {
    const pending = controllableFetch()
    const { fetchPeopleByName } = store.getState().person
    const older = fetchPeopleByName({ page: 1, searchTerm: 'dupo' })
    const newer = fetchPeopleByName({ page: 1, searchTerm: 'dupont' })

    await older
    expect(store.getState().person.loading).toBe(true)

    pending[1]({ hasMore: false, people: [], total: 0 })
    await newer
    expect(store.getState().person.loading).toBe(false)
  })
})
