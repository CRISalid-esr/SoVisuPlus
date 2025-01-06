'use client' // Ensure this file works in a client environment

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { addPublicationSlice, PublicationSlice } from './publication_slice'
import { addUserSlice, UserSlice } from './userSlice'

export type GlobalStore = PublicationSlice & UserSlice

const useStore = create<GlobalStore>()(
  devtools(
    (...a) => ({
      ...addPublicationSlice(...a),
      ...addUserSlice(...a),
    }),
    { name: 'GlobalStore' }, // Optional: Name for debugging in devtools
  ),
)

export default useStore
