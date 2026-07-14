'use client' // Ensure this file works in a client environment

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import {
  addOrganizationUnitSlice,
  OrganizationUnitSlice,
} from './organizationUnitSlice'
import { addPersonSlice, PersonSlice } from './personSlice'
import { addDocumentSlice, DocumentSlice } from './documentSlice'
import { addUserSlice, UserSlice } from './userSlice'
import { addHarvestingSlice, HarvestingSlice } from './harvestingSlice'
import { addDashboardSlice, DashboardSlice } from './dashboardSlice'
import { addHalDepositSlice, HalDepositSlice } from './halDepositSlice'

export type GlobalStore = OrganizationUnitSlice &
  PersonSlice &
  DocumentSlice &
  UserSlice &
  HarvestingSlice &
  DashboardSlice &
  HalDepositSlice

const useStore = create<GlobalStore>()(
  devtools(
    (...a) => ({
      ...addOrganizationUnitSlice(...a),
      ...addPersonSlice(...a),
      ...addDocumentSlice(...a),
      ...addUserSlice(...a),
      ...addHarvestingSlice(...a),
      ...addDashboardSlice(...a),
      ...addHalDepositSlice(...a),
    }),
    { name: 'GlobalStore' }, // Optional: Name for debugging in devtools
  ),
)

export default useStore
