import { create } from 'zustand'
import { addPublicationSlice, PublicationSlice } from './publication_slice'

import { addUserSlice, UserSlice } from './userSlice' // Import the user slice

export type GlobalStore = PublicationSlice & UserSlice

const useStore = create<GlobalStore>()((...a) => ({
  ...addPublicationSlice(...a),
  ...addUserSlice(...a), // Add the user slice to the store
}))

export default useStore
