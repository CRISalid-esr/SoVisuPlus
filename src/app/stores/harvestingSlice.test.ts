import { create } from 'zustand'
import { addHarvestingSlice, HarvestingSlice } from './harvestingSlice'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'

const createTestStore = () =>
  create<HarvestingSlice>()((...a) => ({
    ...addHarvestingSlice(...a),
  }))

it('sets status to "pending" when triggerHarvestings is called', async () => {
  const store = createTestStore()
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  })

  await store
    .getState()
    .harvesting.triggerHarvestings('person-1', [BibliographicPlatform.HAL])

  const harvesting =
    store.getState().harvesting.harvestings['person-1']?.[
      BibliographicPlatform.HAL
    ]
  expect(harvesting?.status).toBe('pending')
  expect(harvesting?.result).toEqual({
    created: 0,
    updated: 0,
    unchanged: 0,
    deleted: 0,
  })
})
it('creates harvesting entry if it does not exist', async () => {
  const store = createTestStore()
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({}) })

  await store
    .getState()
    .harvesting.triggerHarvestings('new-person', [
      BibliographicPlatform.OPENALEX,
    ])

  const harvesting =
    store.getState().harvesting.harvestings['new-person']?.[
      BibliographicPlatform.OPENALEX
    ]
  expect(harvesting).toBeDefined()
  expect(harvesting?.status).toBe('pending')
})
it('sets status to "failed" when the fetch fails', async () => {
  const store = createTestStore()
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

  await store
    .getState()
    .harvesting.triggerHarvestings('person-1', [BibliographicPlatform.HAL])

  const harvesting =
    store.getState().harvesting.harvestings['person-1']?.[
      BibliographicPlatform.HAL
    ]
  expect(harvesting?.status).toBe('failed')
})
it('sets status to "failed" if backend returns !ok', async () => {
  const store = createTestStore()
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'Something went wrong' }),
  })

  await store
    .getState()
    .harvesting.triggerHarvestings('person-1', [BibliographicPlatform.HAL])

  const harvesting =
    store.getState().harvesting.harvestings['person-1']?.[
      BibliographicPlatform.HAL
    ]
  expect(harvesting?.status).toBe('failed')
})
