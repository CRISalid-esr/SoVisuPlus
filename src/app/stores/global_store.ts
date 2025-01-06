'use client' // Ensure this file works in a client environment

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import { addPublicationSlice, PublicationSlice } from './publication_slice'
import { addUserSlice, UserSlice } from './userSlice'

export type GlobalStore = PublicationSlice & UserSlice

const useStore = create<GlobalStore>()(
  devtools(
    persist(
      (...a) => ({
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setItem: (name: string, value: any) => {
            console.log('value', value)
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
