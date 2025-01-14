'use client' // Ensure this file works in a client environment

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import { ResearchStructureSlice,addResearchStructureSlice } from './researchStructureSlice'
import { PersonSlice,addPersonSlice } from './personSlice'
import { PublicationSlice,addPublicationSlice } from './publication_slice'
import { UserSlice,addUserSlice } from './userSlice'

export type GlobalStore = ResearchStructureSlice  & PersonSlice & PublicationSlice & UserSlice

const useStore = create<GlobalStore>()(
  devtools(
    persist(
      (...a) => ({
        ...addResearchStructureSlice(...a),
        ...addPersonSlice(...a),
        ...addPublicationSlice(...a),
        ...addUserSlice(...a),
      }),
      {
        name: 'global-store', // Name of the storage key
        storage: {
          getItem: (name: string) => {
            const item = localStorage.getItem(name)
            return item ? JSON.parse(item) : null
          },
          setItem: <T>(name: string, value: T) => {
            localStorage.setItem(name, JSON.stringify(value))
          },
          removeItem: (name: string) => {
            localStorage.removeItem(name)
          },
        }, // Specify localStorage or sessionStorage
      },
    ),
    { name: 'GlobalStore' }, // Optional: Name for debugging in devtools
  ),
)

export default useStore
