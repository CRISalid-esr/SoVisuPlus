import { StateCreator } from 'zustand'
import type { HalDepositJson } from '@/types/HalDeposit'

/** Client view of a deposit (the API never sends the SWORD password). */
export type HalDepositView = HalDepositJson

/** Payload shape broadcast by the listener over WebSocket (`HalDepositEvent.toJSON`). */
export interface HalDepositEventPayload {
  type: 'hal_deposit'
  depositId: number
  documentUid: string
  personUid: string
  status: HalDepositView['status']
  halId: string | null
  halUrl: string | null
  comment: string | null
  lastError: string | null
}

export interface HalDepositSlice {
  halDeposit: {
    /** Latest deposit per document uid (null = fetched, none exists). */
    byDocument: Record<string, HalDepositView | null>
    loading: Record<string, boolean>
    fetchLatestDeposit: (documentUid: string) => Promise<void>
    createDeposit: (
      documentUid: string,
      form: FormData,
    ) => Promise<{ success: boolean; error?: string; reason?: string }>
    refreshDeposit: (depositId: number) => Promise<void>
    applyDepositEvent: (event: HalDepositEventPayload) => void
  }
}

export const addHalDepositSlice: StateCreator<
  HalDepositSlice,
  [],
  [],
  HalDepositSlice
> = (set, get) => ({
  halDeposit: {
    byDocument: {},
    loading: {},

    fetchLatestDeposit: async (documentUid: string) => {
      set((state) => ({
        halDeposit: {
          ...state.halDeposit,
          loading: { ...state.halDeposit.loading, [documentUid]: true },
        },
      }))
      try {
        const res = await fetch(
          `/api/hal/deposits?documentUid=${encodeURIComponent(documentUid)}`,
        )
        const deposit = res.ok ? ((await res.json()) as HalDepositView | null) : null
        set((state) => ({
          halDeposit: {
            ...state.halDeposit,
            byDocument: { ...state.halDeposit.byDocument, [documentUid]: deposit },
            loading: { ...state.halDeposit.loading, [documentUid]: false },
          },
        }))
      } catch {
        set((state) => ({
          halDeposit: {
            ...state.halDeposit,
            loading: { ...state.halDeposit.loading, [documentUid]: false },
          },
        }))
      }
    },

    createDeposit: async (documentUid: string, form: FormData) => {
      try {
        const res = await fetch('/api/hal/deposits', {
          method: 'POST',
          body: form,
        })
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          return {
            success: false,
            error: body?.error ?? 'Deposit failed',
            reason: body?.reason,
          }
        }
        set((state) => ({
          halDeposit: {
            ...state.halDeposit,
            byDocument: {
              ...state.halDeposit.byDocument,
              [documentUid]: body as HalDepositView,
            },
          },
        }))
        return { success: true }
      } catch {
        return { success: false, error: 'Deposit failed' }
      }
    },

    refreshDeposit: async (depositId: number) => {
      await fetch(`/api/hal/deposits/${depositId}/refresh`, { method: 'POST' })
    },

    applyDepositEvent: (event: HalDepositEventPayload) => {
      // Only update documents whose panel is loaded; others refetch on mount.
      if (!(event.documentUid in get().halDeposit.byDocument)) return
      const existing = get().halDeposit.byDocument[event.documentUid]
      const merged: HalDepositView = {
        ...(existing ?? ({} as HalDepositView)),
        id: event.depositId,
        documentUid: event.documentUid,
        personUid: event.personUid,
        status: event.status,
        halId: event.halId,
        halUrl: event.halUrl,
        comment: event.comment,
        lastError: event.lastError,
      }
      set((state) => ({
        halDeposit: {
          ...state.halDeposit,
          byDocument: {
            ...state.halDeposit.byDocument,
            [event.documentUid]: merged,
          },
        },
      }))
    },
  },
})
