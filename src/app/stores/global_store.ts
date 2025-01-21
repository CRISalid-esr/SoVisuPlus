'use client' // Ensure this file works in a client environment

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import {
  ResearchStructureSlice,
  addResearchStructureSlice,
} from './researchStructureSlice'
import { PersonSlice, addPersonSlice } from './personSlice'
import { DocumentSlice, addDocumentSlice } from './documentSlice'
import { UserSlice, addUserSlice } from './userSlice'

export type GlobalStore = ResearchStructureSlice &
  PersonSlice &
  DocumentSlice &
  UserSlice

const useStore = create<GlobalStore>()(
  devtools(
    (...a) => ({
      ...addResearchStructureSlice(...a),
      ...addPersonSlice(...a),
      ...addDocumentSlice(...a),
      ...addUserSlice(...a),
    }),
    { name: 'GlobalStore' }, // Optional: Name for debugging in devtools
  ),
)

export default useStore
