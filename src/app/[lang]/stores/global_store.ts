import { create } from 'zustand'
import {
  addPublicationSlice,
  PublicationSlice,
} from 'src/app/[lang]/stores/publication_slice'

const useStore = create<PublicationSlice>()((...a) => ({
  ...addPublicationSlice(...a),
}))

export default useStore
