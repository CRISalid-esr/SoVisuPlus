'use client' // Ensure this file works in a client environment

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { addResearchUnitSlice, ResearchUnitSlice } from './researchUnitSlice'
import { addPersonSlice, PersonSlice } from './personSlice'
import { addDocumentSlice, DocumentSlice } from './documentSlice'
import { addUserSlice, UserSlice } from './userSlice'
import { addHarvestingSlice, HarvestingSlice } from './harvestingSlice'

export type GlobalStore = ResearchUnitSlice &
  PersonSlice &
  DocumentSlice &
  UserSlice &
  HarvestingSlice

const useStore = create<GlobalStore>()(
  devtools(
    (...a) => ({
      ...addResearchUnitSlice(...a),
      ...addPersonSlice(...a),
      ...addDocumentSlice(...a),
      ...addUserSlice(...a),
      ...addHarvestingSlice(...a),
    }),
    { name: 'GlobalStore' }, // Optional: Name for debugging in devtools
  ),
)

export default useStore
