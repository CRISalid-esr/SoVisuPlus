import { create } from 'zustand'
import { addUserSlice, UserSlice } from './userSlice'
import { Person } from '@/types/Person'
import { User } from '@/types/User'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { Literal } from '@/types/Literal'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'

const createTestStore = () => {
  return create<UserSlice>((set, get, store) => ({
    ...addUserSlice(set, get, store),
  }))
}

const connectedUserPerson = new Person(
  'person-1',
  false,
  'john@example.com',
  'John Doe',
  'John',
  'Doe',
  [],
)

const otherPerson = new Person(
  'person-2',
  false,
  'jane@example.com',
  'Jane Smith',
  'Jane',
  'Smith',
  [],
)

const organizationUnit = new OrganizationUnit(
  'org-1',
  'ABC',
  [new Literal('Some Research Unit', 'en')],
  [],
  OrganizationCategory.research_unit,
  OrganizationGenericType.unit,
  null,
  [],
  'org:some-research-unit',
)

const mockUser = new User(1, connectedUserPerson)

describe('addUserSlice Tests', () => {
  let useStore: ReturnType<typeof createTestStore>

  beforeEach(() => {
    useStore = createTestStore()
    global.fetch = jest.fn()
  })

  it('should initialize with default values', () => {
    const state = useStore.getState()
    expect(state.user.connectedUser).toBeNull()
    expect(state.user.currentPerspective).toBeNull()
    expect(state.user.loading).toBe(true)
    expect(state.user.error).toBeNull()
    expect(state.user.ownPerspective).toBe(false)
  })

  it('should fetch connected user successfully and compute ownPerspective', async () => {
    useStore.setState((state) => ({
      user: {
        ...state.user,
        currentPerspective: connectedUserPerson, // Same UID as mockUser
      },
    }))

    global.fetch = jest.fn().mockResolvedValue({
      json: async () => mockUser,
    })

    await useStore.getState().user.fetchConnectedUser()

    const updatedState = useStore.getState()
    expect(updatedState.user.connectedUser).toEqual(mockUser)
    expect(updatedState.user.ownPerspective).toBe(true)
  })

  it('should set ownPerspective to false if perspective and user differ', async () => {
    useStore.setState((state) => ({
      user: {
        ...state.user,
        currentPerspective: otherPerson,
      },
    }))

    global.fetch = jest.fn().mockResolvedValue({
      json: async () => mockUser,
    })

    await useStore.getState().user.fetchConnectedUser()

    const updatedState = useStore.getState()
    expect(updatedState.user.connectedUser).toEqual(mockUser)
    expect(updatedState.user.ownPerspective).toBe(false)
  })

  it('setPerspective should set ownPerspective to true when matching', () => {
    useStore.setState((state) => ({
      user: {
        ...state.user,
        connectedUser: mockUser,
      },
    }))

    useStore.getState().user.setPerspective(connectedUserPerson)

    const updatedState = useStore.getState()
    expect(updatedState.user.currentPerspective).toEqual(connectedUserPerson)
    expect(updatedState.user.ownPerspective).toBe(true)
  })

  it('setPerspective should set ownPerspective to false when not matching', () => {
    useStore.setState((state) => ({
      user: {
        ...state.user,
        connectedUser: mockUser,
      },
    }))

    useStore.getState().user.setPerspective(otherPerson)

    const updatedState = useStore.getState()
    expect(updatedState.user.currentPerspective).toEqual(otherPerson)
    expect(updatedState.user.ownPerspective).toBe(false)
  })

  it('setPerspectiveBySlug should fetch and match uid with user', async () => {
    useStore.setState((state) => ({
      user: {
        ...state.user,
        connectedUser: mockUser,
      },
    }))

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => connectedUserPerson,
    })

    await useStore.getState().user.setPerspectiveBySlug('person:person-1')

    const updatedState = useStore.getState()
    expect(fetch).toHaveBeenCalledWith('/api/person/slug/person:person-1')
    expect(updatedState.user.currentPerspective?.uid).toBe('person-1')
    expect(updatedState.user.ownPerspective).toBe(true)
  })

  it('setPerspectiveBySlug should fetch and not match uid with user', async () => {
    useStore.setState((state) => ({
      user: {
        ...state.user,
        connectedUser: mockUser,
      },
    }))

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => otherPerson,
    })

    await useStore.getState().user.setPerspectiveBySlug('person:person-2')

    const updatedState = useStore.getState()
    expect(updatedState.user.currentPerspective?.uid).toBe('person-2')
    expect(updatedState.user.ownPerspective).toBe(false)
  })

  it('setPerspectiveBySlug should fetch an organization for org: slugs', async () => {
    useStore.setState((state) => ({
      user: {
        ...state.user,
        connectedUser: mockUser,
      },
    }))

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => organizationUnit,
    })

    await useStore
      .getState()
      .user.setPerspectiveBySlug('org:some-research-unit')

    const updatedState = useStore.getState()
    expect(fetch).toHaveBeenCalledWith(
      '/api/organizations/slug/org:some-research-unit',
    )
    expect(updatedState.user.currentPerspective).toBeInstanceOf(
      OrganizationUnit,
    )
    expect(updatedState.user.currentPerspective?.uid).toBe('org-1')
    expect(updatedState.user.ownPerspective).toBe(false)
  })

  it('setPerspectiveBySlug should set an error for unknown slug types', async () => {
    await useStore
      .getState()
      .user.setPerspectiveBySlug('research-unit:some-unit')

    const updatedState = useStore.getState()
    expect(fetch).not.toHaveBeenCalled()
    expect(updatedState.user.error).toEqual(
      new Error('Unknown slug type: research-unit:some-unit'),
    )
    expect(updatedState.user.currentPerspective).toBeNull()
  })

  it('refreshPerspective should refetch a person perspective from the person endpoint', async () => {
    useStore.setState((state) => ({
      user: {
        ...state.user,
        connectedUser: mockUser,
        currentPerspective: new Person(
          'person-2',
          false,
          'jane@example.com',
          'Jane Smith',
          'Jane',
          'Smith',
          [],
          [],
          'person',
          'person:person-2',
        ),
        ownPerspective: false,
      },
    }))

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => otherPerson,
    })

    await useStore.getState().user.refreshPerspective()

    expect(fetch).toHaveBeenCalledWith('/api/person/slug/person:person-2')
    const updatedState = useStore.getState()
    expect(updatedState.user.currentPerspective).toBeInstanceOf(Person)
    expect(updatedState.user.currentPerspective?.uid).toBe('person-2')
  })

  it('refreshPerspective should refetch an organization perspective from the organizations endpoint', async () => {
    useStore.setState((state) => ({
      user: {
        ...state.user,
        connectedUser: mockUser,
        currentPerspective: organizationUnit,
        ownPerspective: false,
      },
    }))

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => organizationUnit,
    })

    await useStore.getState().user.refreshPerspective()

    expect(fetch).toHaveBeenCalledWith(
      '/api/organizations/slug/org:some-research-unit',
    )
    const updatedState = useStore.getState()
    expect(updatedState.user.currentPerspective).toBeInstanceOf(
      OrganizationUnit,
    )
    expect(updatedState.user.currentPerspective?.uid).toBe('org-1')
  })
})
