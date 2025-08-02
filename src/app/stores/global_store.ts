'use client' // Ensure this file works in a client environment

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import {
  addResearchStructureSlice,
  ResearchStructureSlice,
} from './researchStructureSlice'
import { addPersonSlice, PersonSlice } from './personSlice'
import { addDocumentSlice, DocumentSlice } from './documentSlice'
import { addUserSlice, UserSlice } from './userSlice'
import { addHarvestingSlice, HarvestingSlice } from './harvestingSlice'

export type GlobalStore = ResearchStructureSlice &
  PersonSlice &
  DocumentSlice &
  UserSlice &
  HarvestingSlice

const useStore = create<GlobalStore>()(
  devtools(
    (...a) => ({
      ...addResearchStructureSlice(...a),
      ...addPersonSlice(...a),
      ...addDocumentSlice(...a),
      ...addUserSlice(...a),
      ...addHarvestingSlice(...a),
    }),
    { name: 'GlobalStore' }, // Optional: Name for debugging in devtools
  ),
)

export default useStore
